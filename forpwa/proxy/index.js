import express from "express";
import cors from "cors";

const app = express();

/* CORS FIRST */
app.use(cors({
    origin: "*",
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-target-url"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());
app.use(express.raw({ type: "*/*" }));

/* Health check */
app.get("/", (req, res) => {
    res.status(200).send("Proxy alive");
});

/* PROXY + PREFLIGHT HANDLING */
app.use(async (req, res) => {

    /* ✅ Handle CORS preflight */
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    const targetBase = req.headers["x-target-url"];

    if (!targetBase) {
        return res.status(400).json({
            error: "Missing x-target-url header"
        });
    }

    try {
        const targetUrl = `${targetBase}${req.originalUrl}`;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: undefined,
                origin: undefined
            },
            body: ["GET", "HEAD"].includes(req.method)
                ? undefined
                : req.body
        });

        res.status(response.status);

        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Proxy error" });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});
