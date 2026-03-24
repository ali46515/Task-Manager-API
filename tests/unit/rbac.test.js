import { requireRole, ROLE_HIERARCHY } from '../../middlewares/rbacMiddleware.js';

describe('RBAC Middleware - Unit Tests', () => {
  const mockNext = jest.fn();

  const buildReq = (role, orgId = 'org123') => ({
    user: {
      _id: 'user123',
      memberships: [{ organization: { toString: () => orgId }, role }],
    },
    orgId,
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => mockNext.mockClear());

  describe('ROLE_HIERARCHY', () => {
    it('should have owner as highest role', () => {
      expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin);
    });
    it('should have viewer as lowest role', () => {
      expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.member);
    });
  });

  describe('requireRole()', () => {
    it('allows owner to access owner-only route', () => {
      const middleware = requireRole('owner');
      middleware(buildReq('owner'), buildRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('blocks member from accessing admin+ route', () => {
      const res = buildRes();
      const middleware = requireRole('admin', 'owner');
      middleware(buildReq('member'), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows admin to access admin+ route', () => {
      const middleware = requireRole('admin', 'owner');
      middleware(buildReq('admin'), buildRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('blocks viewer from member+ routes', () => {
      const res = buildRes();
      const middleware = requireRole('member', 'admin', 'owner');
      middleware(buildReq('viewer'), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 if no user on request', () => {
      const res = buildRes();
      const middleware = requireRole('member');
      middleware({ user: null, orgId: 'org123' }, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 if user is not in the org', () => {
      const res = buildRes();
      const middleware = requireRole('member');
      const req = {
        user: { _id: 'u1', memberships: [] },
        orgId: 'org123',
      };
      middleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('attaches userRole to request on success', () => {
      const req = buildReq('admin');
      const middleware = requireRole('admin', 'owner');
      middleware(req, buildRes(), mockNext);
      expect(req.userRole).toBe('admin');
    });
  });
});