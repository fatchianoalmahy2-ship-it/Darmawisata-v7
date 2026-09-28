# Build & Performance Guidelines for AI Coding Agent

1. **Fast Verification First**:
   - Always run `lint_applet` for rapid syntactic and type verification (~5 seconds) after editing code.
   - Run `compile_applet` sequentially as the final verification step.

2. **No Parallel Build Collisions**:
   - Never invoke shell build commands (`npm run build`, `npx next build`, or `bun run build`) via background tasks (`run_command`) while `compile_applet` is executing.
   - Avoid duplicate/parallel builds to prevent file locks on the `.next` directory.

3. **Preserve Incremental Build Cache**:
   - Never delete or clean the `.next` directory (`rm -rf .next`) unless an unrecoverable file corruption is explicitly detected.
   - Retain the incremental compiler cache to keep build times under 15-30 seconds.

4. **Next.js & Bundling Optimization**:
   - Keep heavy libraries (`lucide-react`, `recharts`, `jspdf`, `xlsx`) listed in `experimental.optimizePackageImports` in `next.config.ts`.
   - Maintain modern Next.js App Router configuration and avoid conflicting legacy webpack/standalone options.

5. **Model-Agnostic LLM Integration & Determinism**:
   - Always enforce strict schema validation via SDK `responseSchema` (Structured Outputs) with `responseMimeType: "application/json"`.
   - Set low temperature (`temperature: 0` or `0.1`) for deterministic, reliable output across different model versions (Flash, Pro, v5, v6, v7, etc.).
   - Implement few-shot canonical examples in system instructions to anchor model outputs.
   - Employ defensive response parsing (stripping markdown fences and preamble) before calling `JSON.parse()`.
   - Isolate model identifiers into central config/environment variables to facilitate zero-friction model upgrades.

6. **Cloud-First & Zero LocalStorage Master Data Architecture**:
   - Supabase (and configured cloud databases) must remain the single source of truth for all master records (students, classes, seating, rooms, rundowns).
   - Never store duplicate master domain data in browser `localStorage`.
   - Use in-memory React state with real-time websocket synchronization for collaborative multi-device updates.
