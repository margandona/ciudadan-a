# Reglas de seguridad Firestore

> La UI puede ocultar botones, pero **las reglas son el control real**. Nunca confiar en el frontend.

## Funciones auxiliares (concepto de reglas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isRole(role) { return signedIn() && request.auth.token.role == role; }
    function isAdminish() { return isRole('MASTER') || isRole('ADMIN'); }
    function inCourse(courseId) {
      return signedIn()
        && (request.auth.token.courses != null)
        && courseId in request.auth.token.courses;
    }
    function isOwn(uid) { return signedIn() && request.auth.uid == uid; }
    function isMemberStudent() { return isRole('ESTUDIANTE'); }

    function isProtectedRole() {
      return isRole('MASTER') || isRole('ADMIN') || isRole('PROFESOR')
          || isRole('PIE') || isRole('UTP');
    }

    // Escrituras sensibles SOLO desde Cloud Functions (admin)
    function onlyServer() { return request.auth != null && request.auth.token.admin == true; }
  }
```

## Reglas por dominio (resumen)

### users
```javascript
  match /users/{uid} {
    allow read: if signedIn() && (request.auth.uid == uid || isAdminish());
    allow create, update, delete: if onlyServer();   // gestión vía Functions
  }
```
- Los campos `role`, `courseIds`, `active` solo se escriben desde Functions.

### courses / courseMembers
```javascript
  match /courses/{courseId} {
    allow read: if signedIn() && (inCourse(courseId) || isAdminish());
    allow create, update, delete: if onlyServer();
  }
  match /courseMembers/{courseId}/{memberId} {
    allow read: if signedIn() && (inCourse(courseId) || isAdminish());
    allow write: if onlyServer();
  }
```

### students
```javascript
  match /students/{studentId} {
    // El estudiante lee su propio perfil; profesor/admin leen del curso
    allow read: if isAdminish()
              || (isRole('PROFESOR') && inCourse(resource.data.courseId))
              || isOwnLinked(studentId);
    allow write: if onlyServer();
  }

  match /students/{studentId}/protected/{doc} {
    // Datos PIE/accesibilidad: SOLO roles autorizados, nunca estudiante/evaluador
    allow read, write: if isProtectedRole() && inCourse(get(studentsPath).data.courseId);
  }
```

### classes y contenido de clase (flippedLesson, presentations, activities, quizzes, games)
```javascript
  match /classes/{classId} {
    allow read: if signedIn() && (inCourse(resource.data.courseId) || isAdminish());
    allow create: if onlyServer();
    allow update: if onlyServer()
               || (isRole('PROFESOR') && inCourse(resource.data.courseId)
                   && request.resource.data.diff(resource.data)
                        .affectedKeys().hasOnly(['status','availability','flippedEnabled','materialIds']));
    allow delete: if onlyServer();
  }
```
> El profesor solo puede tocar disponibilidad/publish; el contenido (bloques) solo vía Functions/editor que sanitiza.

- `flippedLesson`, `presentations`, `activities`, `quizzes`, `games` (subs/docs de clase): lectura para miembros del curso; escrituras de contenido solo `onlyServer()` (editor + validación server-side) o PROFESOR del curso sobre campos no críticos.

### Quiz: ocultar respuestas a estudiantes
```javascript
  match /quizzes/{quizId}/questions/{qid} {
    allow read: if signedIn() && isRole('PROFESOR') && inCourse(...);
    // Estudiantes NO leen preguntas con `answer` directamente.
    // Las preguntas se sirven vía Functions con las respuestas omitidas.
  }
```
> El flujo de quiz para estudiantes usa un callable que devuelve preguntas sin `answer` y corrige server-side; los intentos se escriben con reglas de pertenencia.

### flippedProgress, quizAttempts, gameAttempts
```javascript
  match /flippedProgress/{classId}/{studentId} {
    allow read, update: if isMemberStudent() && isOwn(studentId);
    allow create: if isMemberStudent() && isOwn(studentId)
                  && onlyOwnFields('studentId', ...);
  }
  match /quizAttempts/{quizId}/{studentId} {
    allow read: if isOwn(studentId) || isRole('PROFESOR');
    allow create, update: if isMemberStudent() && isOwn(studentId);
  }
  match /games/{gameId}/attempts/{studentId} {
    allow read: if isOwn(studentId) || isRole('PROFESOR');
    allow create: if isMemberStudent() && isOwn(studentId);
  }
```

### submissions (evidencias)
```javascript
  match /submissions/{submissionId} {
    allow read: if isAdminish()
              || (isRole('PROFESOR') && inCourse(resource.data.courseId))
              || (isMemberStudent() && isOwn(resource.data.studentId));
    // Estudiante crea/actualiza SOLO su propia evidencia, en curso activo
    allow create, update: if isMemberStudent()
              && request.resource.data.studentId == request.auth.uid
              && inCourse(request.resource.data.courseId)
              && immutableFields(['studentId','courseId','activityId'])
              && validStatusTransition();
    allow delete: if onlyServer();
  }
```
> La estudiante no puede inventar `score`/`teacherFeedback` ni cambiar `status` a `REVISADO`; esos campos se bloquean en reglas (escritura solo `onlyServer()` cuando el profesor evalúa vía Functions) y se validan en el use-case.

### participation
```javascript
  match /participation/{courseId}/{classId}/{studentId} {
    allow read: if isAdminish()
              || (isRole('PROFESOR') && inCourse(courseId))
              || (isMemberStudent() && isOwn(studentId));
    allow create, update: if (isRole('PROFESOR') && inCourse(courseId)) || onlyServer();
  }
```

### badges / studentBadges
```javascript
  match /badges/{badgeId} { allow read: if signedIn(); allow write: if onlyServer(); }
  match /studentBadges/{studentId}/{badgeId} {
    allow read: if isOwn(studentId) || (isRole('PROFESOR') && inCourse(...));
    allow create: if (isRole('PROFESOR') && inCourse(...)) || onlyServer();
  }
```

### feedback / exitTickets
```javascript
  match /feedback/{classId}/{studentId} {
    allow read: if isOwn(studentId) || (isRole('PROFESOR') && inCourse(...)) || isAdminish();
    allow create, update: if isMemberStudent() && isOwn(studentId)
              && request.resource.data.studentId == request.auth.uid;
  }
  match /exitTickets/{classId}/{studentId} {
    allow read: if isOwn(studentId) || (isRole('PROFESOR') && inCourse(...)) || isAdminish();
    allow create, update: if isMemberStudent() && isOwn(studentId);
  }
```

### assessments / rubrics / materials (evaluador)
```javascript
  match /rubrics/{rubricId} {
    allow read: if signedIn() && (member of course || isAdminish() || isRole('EVALUADOR'));
    allow write: if onlyServer() || isRole('PROFESOR');
  }
  match /materials/{materialId} {
    // Leer: profesor del curso, admin, o evaluador asignado
    allow read: if isAdminish()
              || (isRole('PROFESOR') && inCourse(resource.data.courseId))
              || (isRole('EVALUADOR') && resource.data.evaluatorId == request.auth.uid);
    // Crear/actualizar: profesor del curso; transiciones de estado y comentarios vía Functions
    allow create: if isRole('PROFESOR') && inCourse(request.resource.data.courseId);
    allow update: if (isRole('PROFESOR') && inCourse(resource.data.courseId))
               || onlyServer();
    allow delete: if onlyServer();
  }
  match /materials/{id}/versions/{v} { ... similar, write solo Functions para archivos validados }
  match /materials/{id}/reviewComments/{c} {
    allow read: if evaluator or profesor/curso/admin;
    allow create: if isRole('EVALUADOR') || (isRole('PROFESOR') && inCourse(...));
  }
```
> El EVALUADOR **no** tiene acceso a `students/`, `submissions`, `participation` ni `feedback` individual (solo agregados vía Functions para métricas autorizadas).

### projections / token
```javascript
  match /projectionTokens/{classId}/{tokenId} {
    allow read: if isRole('PROFESOR') || isRole('ADMIN') || isRole('MASTER');
    // El player de proyección autentica con el token; las interacciones anónimas
    // (votación/quiz colectivo) se agregan vía Functions con rate limiting.
  }
```

### auditLogs / settings
```javascript
  match /auditLogs/{logId} { allow read, write: if onlyServer(); }
  match /settings/{key} {
    allow read: if isAdminish() || isRole('PROFESOR');
    allow write: if onlyServer() || isRole('MASTER');
  }
```

## Casos de prueba de reglas (unitarias, emulador)

| Caso | Acción | Resultado esperado |
|---|---|---|
| R1 | Estudiante lee `students` de otra | DENY |
| R2 | Estudiante lee `submissions` de otra | DENY |
| R3 | Estudiante escribe `score`/`teacherFeedback` en su submission | DENY |
| R4 | Estudiante crea submission con `courseId` de otro curso | DENY |
| R5 | Estudiante cambia `status` de evidencia | DENY |
| R6 | Profesor lee curso no asignado | DENY |
| R7 | Profesor del curso lee evidencias del curso | ALLOW |
| R8 | Profesor activa/desactiva clase del curso | ALLOW |
| R9 | Profesor modifica bloques de contenido de clase directamente | DENY (solo Functions) |
| R10 | Evaluador lee material asignado | ALLOW |
| R11 | Evaluador lee perfil de estudiante | DENY |
| R12 | Evaluador aprueba material no asignado | DENY |
| R13 | Estudiante lee `students/{id}/protected` (PIE) | DENY |
| R14 | Profesor del curso lee `protected` de su estudiante | ALLOW |
| R15 | Estudiante lee `quizzes/{id}/questions` (answer expuesta) | DENY |
| R16 | Estudiante escribe feedback ajeno / con studentId distinto | DENY |
| R17 | Anónimo escribe auditoría | DENY |
| R18 | MASTER administra usuarios y settings | ALLOW |

> Ver `docs/TEST_STRATEGY.md` para el runner de estas reglas con `@firebase/rules-unit-testing` y emulador.
