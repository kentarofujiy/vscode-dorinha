
type Options = {
  apiKey: string;
  completionParams: { model: string; temperature?: number; top_p?: number; max_tokens?: number };
};

type SendOptions = { onProgress: (answer: string) => void };

type ChatResponse = {
  id: string;
  text: string;
};

export const chatgpt = (opts: Options) => {
  const { apiKey, completionParams } = opts;

  const send = async (content: string, sendOpts: SendOptions): Promise<ChatResponse> => {
    const { onProgress } = sendOpts;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const body = {
      ...completionParams,
      messages: [{ content, role: 'user' }],
      stream: true, // **IMPORTANT: Enable streaming!** 
      user: '68291e08-565e-448e-9e14-f80088028db6' 
    };

    const response = await fetch('http://192.168.15.11:8283/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    let fullResponse = '';
    const { createParser } = await import('eventsource-parser');
    const parser = createParser((event) => {
      if (event.type === 'event') {
        const data = event.data;
        if (data === '[DONE]') return;

        try {
          const parsedData = JSON.parse(data);
          const content = parsedData.choices[0]?.delta?.content || '';
          fullResponse += content;
          onProgress(fullResponse); // Update the UI with each chunk
        } catch (error) {
          console.error('Error parsing stream:', error);
        }
      }
    });

    // Stream the response
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          parser.feed(chunk);
        }
      }
    }

    return { id: '', text: fullResponse }; // You might need to get the ID from your LLM
  };

  return { send };
}; 

