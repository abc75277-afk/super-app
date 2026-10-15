module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const raw = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  let msgs = raw
    .slice(-12)
    .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 1500) }] }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length) return res.status(400).json({ error: "empty" });

  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "Ты помощник сайта SOMATO-MASS: набор мышечной массы, тренировки, питание (БЖУ), добавки. Отвечай коротко и по делу, на языке пользователя. Ты не врач: при болях, травмах и заболеваниях советуй обратиться к специалисту. Не давай гарантий результата. Если вопрос не по теме, мягко верни разговор к теме сайта." }] },
          contents: msgs,
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    );
    const data = await r.json();
    const reply = data.candidates && data.candidates[0] && data.candidates[0].content &&
                  data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
    if (!r.ok || !reply) return res.status(502).json({ error: "upstream" });
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: "server" });
  }
};
