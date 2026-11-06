import type { CurrentRole } from '@/features/auth/permissions';
export type ModalProps = { isOpen: boolean; onClose: () => void; busy?: boolean };
export type CreateModalProps<T> = ModalProps & {
  onSubmit: (input: T) => Promise<boolean>;
  currentRole: CurrentRole;
};
