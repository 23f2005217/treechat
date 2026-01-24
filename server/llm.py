import openai
from server.config import settings

def get_llm_client():
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set")
    return openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

async def generate_response(messages, model="gpt-4o"):
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=model,
        messages=messages
    )
    return response.choices[0].message.content
