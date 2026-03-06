import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from './src/lib/logger';

export const config = {
  matcher: ['/:path*'],
};

const logger = getLogger();

export function proxy(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  logger.debug(`Middleware IP: ${ip}`);

  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1];
      const decoded = atob(authValue || '');
      const [user, pwd] = decoded.split(':');

      const validUser = process.env.BASIC_AUTH_USER;
      const validPassWord = process.env.BASIC_AUTH_PASSWORD;

      if (
        validUser &&
        validPassWord &&
        user === validUser &&
        pwd === validPassWord
      ) {
        return NextResponse.next();
      }
    } catch (e) {
      logger.error(e, 'Auth error');
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Restricted Area"',
    },
  });
}
