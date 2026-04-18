import { useCallback } from 'react';
import toast from 'react-hot-toast';

export function useToastHelpers() {
  const showSuccess = useCallback((
    title: string,
    description: string,
    _duration: number = 5000,
    _isClosable: boolean = true,
  ) => {
    toast.success(description ? `${title}: ${description}` : title, { duration: _duration });
  }, []);

  const showError = useCallback((
    title: string,
    description: string,
    _duration: number = 5000,
    _isClosable: boolean = true,
  ) => {
    toast.error(description ? `${title}: ${description}` : title, { duration: _duration });
  }, []);

  return { showSuccess, showError };
}
