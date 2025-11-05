# Signator.IO

This is a simple project that allows anyone to sign and confirm a signature. It works with both raw data and EIP-712 typed data![image.png](https://raw.githubusercontent.com/ByteAtATime/signatorio/refs/heads/main/assets/image.png)

## Local Development

1. Clone the repo & install dependencies

```bash
yarn install
```

2. Start the local database (docker) and create the schema

```bash
docker compose up -d
yarn drizzle-kit push
```

3. Run the application

```bash
yarn start
```

Open the application in the browser at http://localhost:3000
