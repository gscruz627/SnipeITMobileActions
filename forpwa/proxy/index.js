import express from "express";

const app = express();

app.use(express.json());
app.get("/", (req, res) => {
    res.status(200).send("Proxy is running");
});
app.use( async (req, res) => {
    try {
        const targetBase = req.headers["x-target-url"];
        const targetUrl = `${targetBase}${req.originalUrl}`;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                ...req.headers,
                host: undefined,
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

app.listen(8000);