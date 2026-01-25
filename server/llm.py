import openai
from server.config import settings

def get_llm_client():
    if settings.NVIDIA_API_KEY:
        return openai.AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY
        )
    if settings.OPENAI_API_KEY:
        return openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    raise ValueError("Neither NVIDIA_API_KEY nor OPENAI_API_KEY is set")

async def generate_response(messages, model="nvidia/nemotron-3-nano-30b-a3b"):
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=model,
        messages=messages
    )
    return response.choices[0].message.content
