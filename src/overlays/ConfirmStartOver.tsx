import { useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toasts';
import { useApp } from '../state/AppContext';

export function ConfirmStartOver() {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const close = () => dispatch({ type: 'SET_UI', patch: { confirmStartOverOpen: false } });
  return (
    <Modal
      open={state.ui.confirmStartOverOpen}
      onOpenChange={(o) => !o && close()}
      title="Start over?"
      description="This clears every scenario's setup, review decisions, gaps and what-if changes. You'll return to the start screen."
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dispatch({ type: 'RESET_ALL' });
              toast('Everything cleared.', 'info');
            }}
          >
            Start over
          </Button>
        </>
      }
    />
  );
}
