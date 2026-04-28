import {AuthContextType} from "@/context/AuthProvider"

export const hasSelectedRoleAccess = (auth: AuthContextType): boolean => {
  if (!auth.selectedRole?.role_id) {
    return false
  }

  return auth.rolesWithAccess.some(role =>
    role.role_id === auth.selectedRole?.role_id
  )
}
