import { ROLES, ROUTES } from "@/config/constants";
import type { UserRole } from "@/types/api";

export function getRedirectForRole(role: UserRole | null): string {
  switch (role) {
    case ROLES.CASHIER:
      return ROUTES.POS;
    case ROLES.STOREKEEPER:
      return ROUTES.INVENTORY;
    case ROLES.MANAGER:
      return ROUTES.MANAGER;
    default:
      return ROUTES.LOGIN;
  }
}
