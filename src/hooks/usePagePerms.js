import { useAuth, hasPerm } from '../contexts/AuthContext'

export default function usePagePerms(menuKey) {
  const { user } = useAuth()
  return {
    canView:   hasPerm(user, menuKey, 'view'),
    canAdd:    hasPerm(user, menuKey, 'add'),
    canEdit:   hasPerm(user, menuKey, 'edit'),
    canDelete: hasPerm(user, menuKey, 'delete'),
  }
}
