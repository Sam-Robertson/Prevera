import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { CognitoJwtVerifier } from "aws-jwt-verify";

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private idVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    tokenUse: "id",
    clientId: process.env.COGNITO_CLIENT_ID!,
  });

  private accessVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    tokenUse: "access",
    clientId: process.env.COGNITO_CLIENT_ID!,
  });

  async canActivate(ctx: ExecutionContext) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      console.error("Missing COGNITO env vars", { userPoolId, clientId });
      throw new UnauthorizedException("Server auth misconfigured");
    }

    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization || "";

    if (!auth.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = auth.slice(7).trim();
    const decoded = decodeJwtPayload(token);

    if (!decoded?.token_use) {
      console.error("JWT missing token_use (not a Cognito JWT?)", decoded);
      throw new UnauthorizedException("Invalid token");
    }

    try {
      const payload =
        decoded.token_use === "access"
          ? await this.accessVerifier.verify(token)
          : await this.idVerifier.verify(token);

      req.auth = payload;
      return true;
    } catch (err: any) {
      console.error("COGNITO VERIFY FAILED", {
        message: err?.message ?? String(err),
        token_use: decoded?.token_use,
        iss: decoded?.iss,
        aud: decoded?.aud,
        client_id: decoded?.client_id,
      });
      throw new UnauthorizedException("Invalid token");
    }
  }
}
