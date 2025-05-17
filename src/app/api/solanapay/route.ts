import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

function isPrivateIP(hostname: string): boolean {
  return (
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.") ||
    hostname.startsWith("0.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("192.168")
  );
}

export async function POST(req: Request) {
  try {
    const { url: urlString, address } = await req.json();

    if (!urlString || !address) {
      throw new Error("Missing required parameters");
    }

    const url = new URL(urlString);
    if (isPrivateIP(url.hostname)) {
      throw new Error("Access to private IPs is not allowed");
    }

    const pubkey = new PublicKey(address);
    if (pubkey.toBase58() !== address) {
      throw new Error("Address mismatch");
    }

    const responsePayload = {
      get: {},
      post: {},
    };

    const getRes = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "burner.codes",
        "Accept": "application/json",
      },
    });

    if (!getRes.ok || !getRes.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Invalid GET response");
    }

    responsePayload.get = await getRes.json();

    const postRes = await fetch(url.toString(), {
      method: "POST",
      cache: "no-store",
      headers: {
        "User-Agent": "burner.codes",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account: pubkey.toBase58() }),
    });

    if (!postRes.ok || !postRes.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Invalid POST response");
    }

    responsePayload.post = await postRes.json();

    return new Response(JSON.stringify(responsePayload), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.warn("[solana pay proxy error]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
