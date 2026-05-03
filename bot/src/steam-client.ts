// Steam client init — login refresh JWT + Dota 2 GC connection.
// Pattern: steam-user v5 + steam-totp + node-dota2.

// Sem types oficiais @types/steam-user / @types/node-dota2 — declarar como any module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SteamUser = require("steam-user");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SteamTotp = require("steam-totp");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Dota2 = require("node-dota2");

interface StartSteamOpts {
  accountName: string;
  refreshToken?: string;            // 200d JWT — preferido
  password?: string;                // fallback se refreshToken expirou (re-gera JWT)
  sharedSecret?: string;            // pra TOTP 2FA (login com password)
  dataDir: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SteamUserClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dota2Client = any;

export interface SteamBotState {
  steam: SteamUserClient;
  dota: Dota2Client;
}

export async function startSteamClient(opts: StartSteamOpts): Promise<SteamBotState> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const steam: SteamUserClient = new SteamUser({
    dataDirectory: opts.dataDir,
    autoRelogin: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const dota: Dota2Client = new Dota2.Dota2Client(steam, true, false);

  return new Promise<SteamBotState>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Steam login timeout (60s)"));
    }, 60_000);

    steam.on("error", (err: Error) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    steam.on("loggedOn", () => {
      console.log("[steam] logged on as", opts.accountName);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      steam.setPersona(SteamUser.EPersonaState.Online);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      dota.launch();
    });

    // Refresh token recebido apos primeiro login com password+TOTP
    steam.on("refreshToken", (token: string) => {
      console.log("[steam] new refreshToken (salvar em STEAM_REFRESH_TOKEN env):");
      console.log(token.slice(0, 20) + "...");
      // Em prod: salvar em volume /data/refresh_token.txt pra próximo restart
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    dota.on("ready", () => {
      console.log("[dota] GC connection ready");
      clearTimeout(timeoutId);
      resolve({ steam, dota });
    });

    dota.on("unready", () => {
      console.log("[dota] GC connection lost — auto-relogin via steam-user");
    });

    // Decide login method
    if (opts.refreshToken) {
      console.log("[steam] login with refreshToken");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      steam.logOn({ refreshToken: opts.refreshToken });
    } else if (opts.password && opts.sharedSecret) {
      const code = SteamTotp.generateAuthCode(opts.sharedSecret);
      console.log("[steam] login with password+TOTP (first time)");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      steam.logOn({
        accountName: opts.accountName,
        password: opts.password,
        twoFactorCode: code,
      });
    } else {
      reject(new Error("Provide STEAM_REFRESH_TOKEN OR (STEAM_PASSWORD + STEAM_SHARED_SECRET)"));
    }
  });
}
