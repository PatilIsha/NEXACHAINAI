import { useToast } from '../../context/ToastContext.jsx';
import { IconCopy } from '../ui/Icons.jsx';

/** Shows the referral code and sign-up link with copy buttons. */
export default function ReferralCodeBox({ code }) {
  const toast = useToast();
  const link = `${window.location.origin}/register?ref=${code || ''}`;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed - please copy manually');
    }
  };

  return (
    <div className="code-box">
      <code>{code || '-'}</code>
      <button type="button" className="btn btn-sm" onClick={() => copy(code, 'Referral code')} disabled={!code}>
        <IconCopy /> Copy code
      </button>
      <button type="button" className="btn btn-sm" onClick={() => copy(link, 'Referral link')} disabled={!code}>
        <IconCopy /> Copy link
      </button>
    </div>
  );
}
