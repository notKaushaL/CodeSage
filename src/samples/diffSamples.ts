export interface SampleDiff {
  id: string;
  title: string;
  badge: string;
  description: string;
  rawDiff: string;
}

export const SAMPLE_DIFFS: SampleDiff[] = [
  {
    id: 'vulnerable_sql_jwt',
    title: 'Vulnerable SQL Injection & Leaked JWT Secret',
    badge: 'Critical Security Risks',
    description: 'Realistic Node/TypeScript backend patch introducing raw string concatenated SQL queries, hardcoded AWS Access Key, and exposed JWT signing secret.',
    rawDiff: `diff --git a/src/api/authService.ts b/src/api/authService.ts
index 45f8a12..9bc3110 100644
--- a/src/api/authService.ts
+++ b/src/api/authService.ts
@@ -14,8 +14,14 @@ export class AuthService {
   private db: DatabasePool;

   constructor(db: DatabasePool) {
     this.db = db;
-    const awsRootKey = process.env.AWS_ACCESS_KEY_ID;
-    const jwtSecret = process.env.JWT_SECRET;
+    // Temporary test credentials committed by developer
+    const awsRootKey = "AKIAIOSFODNN7EXAMPLE";
+    const jwtSecret = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMC6Y5";
   }

   public async verifySession(token: string): Promise<UserSession | null> {
@@ -35,7 +41,12 @@ export class AuthService {
   public async searchUsers(userInput: string) {
-    return this.db.query('SELECT id, username, email FROM users WHERE active = true');
+    // Dynamic search query constructed directly from user-supplied query string
+    const sqlQuery = "SELECT id, username, email FROM users WHERE username LIKE '%" + userInput + "%' AND active = true";
+    console.log("Executing user search with password query:", userInput);
+    return this.db.query(sqlQuery);
   }
 }
diff --git a/src/utils/cryptoHelper.ts b/src/utils/cryptoHelper.ts
index 11ab234..77cd890 100644
--- a/src/utils/cryptoHelper.ts
+++ b/src/utils/cryptoHelper.ts
@@ -8,4 +8,7 @@ export function generateChecksum(data: string): string {
-  return crypto.createHash('sha256').update(data).digest('hex');
+  // Replaced with legacy MD5 for speed
+  return crypto.createHash('md5').update(data).digest('hex');
 }
`,
  },
  {
    id: 'memory_leak_goroutine',
    title: 'Goroutine Concurrency Leak & Error Swallowing',
    badge: 'Performance & Reliability',
    description: 'High-throughput Go data ingestion service with unconstrained goroutine spawning, missing context cancellation, and unhandled database errors.',
    rawDiff: `diff --git a/worker/pipeline.go b/worker/pipeline.go
index 33fa901..88ac012 100644
--- a/worker/pipeline.go
+++ b/worker/pipeline.go
@@ -22,6 +22,18 @@ type IngestionWorker struct {
 	db     *sql.DB
 }

 func (w *IngestionWorker) ProcessBatch(records []DataRecord) {
-	for _, rec := range records {
-		w.processSingleRecord(rec)
-	}
+	// Spawn goroutines concurrently for all incoming records without bounded semaphore
+	for _, rec := range records {
+		go func(r DataRecord) {
+			// Potential goroutine leak if upstream channel blocks or db hangs
+			err := w.db.Ping()
+			if err != nil {
+				return // Swallowing error without closing resources or signaling context
+			}
+			w.processSingleRecord(r)
+		}(rec)
+	}
 }
`,
  },
  {
    id: 'clean_refactor',
    title: 'Clean Architecture Refactor & Parameterized Queries',
    badge: 'Clean / Safe',
    description: 'Production-ready pull request introducing Zod schema validation, parameterized SQL bindings, environment secret loading, and regression tests.',
    rawDiff: `diff --git a/src/services/userService.ts b/src/services/userService.ts
index aa1209e..55bc812 100644
--- a/src/services/userService.ts
+++ b/src/services/userService.ts
@@ -10,8 +10,13 @@ import { z } from 'zod';
 const UserQuerySchema = z.object({
   searchTerm: z.string().min(1).max(100).trim(),
   limit: z.number().int().positive().max(50).default(20),
 });

 export async function findUsers(params: unknown, db: DatabasePool) {
   const validated = UserQuerySchema.parse(params);
-  return db.query("SELECT * FROM users WHERE name = '" + params + "'");
+  const query = 'SELECT id, username, email, created_at FROM users WHERE username ILIKE $1 AND active = true LIMIT $2';
+  return db.query(query, [\`%\${validated.searchTerm}%\`, validated.limit]);
 }
`,
  },
];
