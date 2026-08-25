import type { Request } from 'express';
import type { CurrentUser } from '@golden-knot/shared';

export interface RequestWithUser extends Request {
  user: CurrentUser;
}
