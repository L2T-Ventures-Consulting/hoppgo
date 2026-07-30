import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

import onnxruntime as ort
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from rembg import remove
from rembg.sessions import sessions_class
from rembg.sessions.base import BaseSession

MODEL = os.environ.get("BACKGROUND_REMOVAL_MODEL", "u2netp")
MAX_INPUT_SIZE = 16 * 1024 * 1024

session: BaseSession | None = None


def create_session() -> BaseSession:
    session_class = next(
        (candidate for candidate in sessions_class if candidate.name() == MODEL),
        None,
    )
    if session_class is None:
        raise ValueError(f"Unsupported model: {MODEL}")

    # Keep memory predictable on small CPU containers. Sequential execution is
    # fast enough for this private worker and avoids duplicate ONNX buffers.
    options = ort.SessionOptions()
    options.enable_cpu_mem_arena = False
    options.enable_mem_pattern = False
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
    options.inter_op_num_threads = 1
    options.intra_op_num_threads = 1
    return session_class(
        MODEL,
        options,
        providers=["CPUExecutionProvider"],
    )


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global session
    session = await run_in_threadpool(create_session)
    yield
    session = None


app = FastAPI(
    title="Louez background removal",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, str]:
    if session is None:
        raise HTTPException(status_code=503, detail="model_not_ready")
    return {"status": "ok"}


@app.post("/api/remove", response_class=Response)
async def remove_background(
    file: Annotated[UploadFile, File()],
    model: Annotated[str, Form()] = MODEL,
) -> Response:
    if model != MODEL:
        raise HTTPException(status_code=400, detail="unsupported_model")
    if session is None:
        raise HTTPException(status_code=503, detail="model_not_ready")

    content = await file.read(MAX_INPUT_SIZE + 1)
    if not content or len(content) > MAX_INPUT_SIZE:
        raise HTTPException(status_code=413, detail="invalid_image_size")

    try:
        output = await run_in_threadpool(
            remove,
            content,
            session=session,
            force_return_bytes=True,
        )
    except Exception as error:
        raise HTTPException(status_code=422, detail="invalid_image") from error

    if not isinstance(output, bytes) or not output:
        raise HTTPException(status_code=422, detail="empty_output")

    return Response(content=output, media_type="image/png")
