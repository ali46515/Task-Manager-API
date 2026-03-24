const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    const orgId = req.orgId;

    if (!user || !orgId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const membership = user.memberships.find(
      (m) => m.organization.toString() === orgId.toString(),
    );

    if (!membership) {
      return res
        .status(403)
        .json({ message: "You are not a member of this organization" });
    }

    const userLevel = ROLE_HIERARCHY[membership.role] || 0;
    const requiredLevel = Math.min(
      ...allowedRoles.map((r) => ROLE_HIERARCHY[r] || 99),
    );

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    req.userRole = membership.role;
    next();
  };
};

export { requireRole, ROLE_HIERARCHY };
