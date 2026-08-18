# Open-source findings — DeepSeek/voice

## Vercel AI SDK

Source: https://github.com/vercel/ai

- Repository public, TypeScript-focused, intended for Next.js/React and other UI frameworks.
- Provides `generateText`, structured output via `Output.object`, agents/tool loops, provider packages, and UI hooks.
- Repository page showed 26.3k stars and active commits at the time of review.
- It is a possible fit for replacing the custom chat UI/streaming layer, but it should not replace ZenithTasks' server-side permission, preview/approval, audit and domain actions. Migration risk is non-trivial because the current app already has a custom planner/action contract.
- Decision for now: do not wholesale replace the current agent. Evaluate only a narrow adapter or streaming/UI use if DeepSeek provider compatibility is confirmed in staging.

## whisper.cpp

Source: https://github.com/ggml-org/whisper.cpp

- Public C/C++ port of Whisper with MIT license, CPU/GPU/WASM support and a server/bindings ecosystem.
- README documents Docker/Linux/Windows support, VAD, quantization and offline operation.
- README reports approximate memory usage: tiny ~273 MB, base ~388 MB, small ~852 MB, medium ~2.1 GB, large ~3.9 GB.
- The CLI currently expects 16-bit WAV for the documented quick path and recommends FFmpeg conversion from webm/mp3 to 16 kHz mono WAV.
- It is a strong option for privacy-preserving voice transcription, but it needs a persistent process/custom runtime and model files. It is not appropriate to bundle directly into the Next.js web container without checking server resources and deployment topology.
- Decision for now: keep current `VOICE_API_KEY` route as the default; design whisper.cpp as an optional self-hosted transcription backend selected by `VOICE_PROVIDER=whisper-cpp` after staging benchmark.

## Initial architecture conclusion

DeepSeek should remain the main reasoning/planner model. Open-source additions should be small and bounded: optional whisper.cpp for local STT, structured evaluation and possibly a narrow AI SDK adapter for streaming. Do not introduce a large agent framework or RAG platform unless a concrete repository need and deployment budget justify it.

## whisper-server endpoint verification

Source: https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md

- `whisper-server` defaults to port 8080 and exposes `/inference` as the documented inference path.
- The documented request is multipart form-data with `file`, `temperature`, `temperature_inc`, `prompt`, `carry_initial_prompt` and `response_format=json`.
- It can convert audio with FFmpeg when started with `--convert`, and it supports language selection and VAD options.
- The upstream README explicitly warns that the server accepts file uploads and should run sandboxed with input validation; ZenithTasks must keep its authenticated proxy in front of it and must not expose whisper-server directly to the public internet.
- Decision: implement `VOICE_PROVIDER=whisper-cpp` as an optional backend that posts to `/inference`, while retaining the current OpenAI-compatible `/audio/transcriptions` backend as default. The app proxy will continue enforcing `mod:tro-ly`, size/MIME limits and timeout.
