FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json requirements.txt ./
RUN npm ci && pip3 install --break-system-packages --no-cache-dir -r requirements.txt

COPY . .
RUN npm run build

ENV PORT=10000
EXPOSE 10000

CMD ["python3", "app.py"]