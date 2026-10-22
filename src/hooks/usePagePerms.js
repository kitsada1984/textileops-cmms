import { useAuth, hasPerm } from '../contexts/AuthContext'

export default function usePagePerms(menuKey) {
  const { user } = useAuth()
  const check = typeof hasPerm === 'function' ? hasPerm : () => true
  return {
    canView:   check(user, menuKey, 'view'),
    canAdd:    check(user, menuKey, 'add'),
    canEdit:   check(user, menuKey, 'edit'),
    canDelete: check(user, menuKey, 'delete'),
  }
}
