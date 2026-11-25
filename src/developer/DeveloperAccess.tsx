import React, { useState } from 'react';
import { developerAuth } from './developerAuth';
import { KeyRound, X } from 'lucide-react';

export function DeveloperAccess({ onAuthenticated, onCancel }: { onAuthenticated: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (!(await developerAuth.authenticate(password))) throw new Error('암호가 일치하지 않습니다.');
      setPassword(''); onAuthenticated();
    } catch (err) { setError(err instanceof Error ? err.message : '인증에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <div className="lovy-dev-access" role="dialog" aria-modal="true" aria-labelledby="lovy-dev-title">
    <form onSubmit={submit} className="lovy-dev-access-card">
      <button type="button" className="lovy-dev-access-close" onClick={onCancel} aria-label="닫기"><X size={18}/></button>
      <KeyRound size={30}/><h2 id="lovy-dev-title">개발자 모드 인증</h2>
      <p>개발자 전용 페이지에 접근하려면 암호를 입력하세요.</p>
      <label>암호<input type="password" autoComplete="current-password" autoFocus required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="lovy-dev-error">{error}</p>}
      <div className="lovy-dev-access-actions"><button type="button" onClick={onCancel}>취소</button><button type="submit" disabled={busy}>{busy ? '확인 중…' : '인증'}</button></div>
    </form>
  </div>;
}
