from openai import OpenAI

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key="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",
)

completion = client.chat.completions.create(
    model="nvidia/nemotron-3-nano-30b-a3b",
    messages=[{"content": "const vs let in javascript", "role": "user"}],
    temperature=1,
    top_p=1,
    max_tokens=8192,
    extra_body={
        "reasoning_budget": 16384,
        "chat_template_kwargs": {"enable_thinking": False},
    },
    stream=True,
)

for chunk in completion:
    if chunk.choices and chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="")
