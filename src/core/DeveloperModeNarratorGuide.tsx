import React from 'react';
import { NARRATOR_PROMPT_FILES } from '../prompts/narrator/promptRegistry';
import { Code2, FileCode, FolderTree, Wrench, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const DeveloperModeNarratorGuide: React.FC = () => {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/95 border-2 border-indigo-500/50 space-y-6 text-xs shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Code2 size={20} className="text-pink-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              개발자 모드: 사회자 프롬프트 소스코드 및 빌드 안내
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            고급 사용자를 위한 사회자 시스템 프롬프트 실제 경로(<code className="text-pink-300 font-mono">src/prompts/narrator/</code>), 파일별 역할, 소스코드 직접 수정 및 빌드 절차 안내입니다.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-indigo-200 font-mono shrink-0">
          <FolderTree size={14} className="text-sky-400" />
          <span>src/prompts/narrator/</span>
        </div>
      </div>

      {/* Distinction Notice: Room Character/Worldview Prompt vs Internal Narrator Prompt */}
      <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 space-y-1.5 text-xs text-indigo-100">
        <div className="font-bold text-sky-300 flex items-center gap-2">
          <Info size={15} className="shrink-0" />
          <span>채팅방 프롬프트 수정 기능과의 구분 안내</span>
        </div>
        <p className="leading-relaxed text-slate-200">
          • <strong>채팅방 설정의 캐릭터·세계관 프롬프트 수정</strong>은 특정 채팅방에서 캐릭터의 성격·말투·세계관을 개별 조정하는 일반 사용자 기능입니다.
          <br />• <strong>사회자 내부 프롬프트(.md)</strong>는 이야기 연출 규칙(일반 사회자 7종 + 막장 사회자 <code className="text-pink-300 font-mono">makjang.md</code>)을 정의하는 시스템 소스 파일이며, 앱 내부 편집기를 제공하지 않습니다.
        </p>
      </div>

      {/* Emphasized Build Precaution Banner */}
      <div className="p-4 rounded-xl bg-amber-950/85 border-2 border-amber-500/60 space-y-2 text-xs text-amber-100 shadow-lg">
        <div className="font-bold text-amber-300 flex items-center gap-2 text-sm">
          <AlertTriangle size={17} className="shrink-0" />
          <span>사회자 프롬프트 소스코드 직접 수정 및 필수 빌드 절차</span>
        </div>
        <p className="leading-relaxed text-amber-200">
          • 사회자 내부 규칙을 변경하고 싶은 고급 사용자는 공개 소스코드의 <code className="text-white font-mono bg-amber-900/80 px-1.5 py-0.5 rounded">src/prompts/narrator/</code> 디렉터리에 있는 마크다운(<code className="text-white font-mono bg-amber-900/80 px-1.5 py-0.5 rounded">.md</code>) 파일을 직접 수정합니다.
          <br />• <strong>개발 서버 운용 시:</strong> <code className="text-white font-mono bg-amber-900/80 px-1.5 py-0.5 rounded">npm run dev</code> 실행 중에는 마크다운 파일 저장 후 다음 대화 응답부터 즉시 반영됩니다.
          <br />• <strong>프로덕션 배포 시:</strong> 수정한 프롬프트를 번들 및 실행 환경에 반영하려면 반드시 터미널에서 <code className="text-white font-mono bg-amber-900/80 px-1.5 py-0.5 rounded">npm run build</code>를 실행하여 다시 빌드해야 합니다.
        </p>
      </div>

      {/* Card-Format UI Matching Filenames and Roles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-white text-sm flex items-center gap-2">
            <FileCode size={16} className="text-pink-400" />
            <span>사회자 프롬프트 {NARRATOR_PROMPT_FILES.length}종 파일 경로 및 역할</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            총 {NARRATOR_PROMPT_FILES.length}개 마크다운 파일 (막장 모드 포함)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {NARRATOR_PROMPT_FILES.map((file) => {
            const isMakjang = file.id === 'makjang';
            return (
              <div
                key={file.id}
                className={`p-4 rounded-xl bg-slate-950 border transition-all flex flex-col justify-between gap-3 shadow-md group ${
                  isMakjang
                    ? 'border-red-500/40 hover:border-red-400/70'
                    : 'border-slate-800 hover:border-pink-500/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-white text-xs group-hover:text-pink-300 transition-colors">
                      {file.title}
                    </span>
                    <code
                      className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 border ${
                        isMakjang
                          ? 'text-red-200 bg-red-950/70 border-red-500/40'
                          : 'text-pink-300 bg-pink-950/60 border-pink-500/30'
                      }`}
                    >
                      {file.fileName}
                    </code>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{file.role}</p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate">{file.sourcePath}</span>
                  <CheckCircle2
                    size={12}
                    className={isMakjang ? 'text-red-400 shrink-0' : 'text-emerald-400 shrink-0'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Source Code Integration & Editing Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-bold text-sky-300 flex items-center gap-1.5 text-xs">
            <Wrench size={14} />
            <span>소스코드 직접 수정 절차</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-xs">
            1. 코드 에디터(VS Code 등)에서 러비러비톡 소스코드를 엽니다.
            <br />
            2. <code className="text-pink-300 font-mono">src/prompts/narrator/</code> 폴더에서 수정할 <code className="text-pink-300 font-mono">.md</code> 파일(예: <code className="text-red-300 font-mono">makjang.md</code>)을 편집 후 저장합니다.
            <br />
            3. 백엔드 라우트(<code className="text-indigo-300 font-mono">server.ts</code>)가 해당 파일을 읽어 단일 API 호출에 반영합니다.
            <br />
            4. 배포 환경 적용을 위해 <code className="text-amber-300 font-mono">npm run build</code>를 실행합니다.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
            <CheckCircle2 size={14} />
            <span>토큰 최적화 및 모드 분리 구조</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-xs">
            • <strong>일반 모드:</strong> <code className="text-red-300 font-mono">makjang.md</code>를 API에 전송하지 않으며, 5개 일반 유형 중 맥락에 맞는 프롬프트만 선별 주입합니다.
            <br />
            • <strong>막장 모드:</strong> 채팅방 로컬 설정이 ON일 때만 <code className="text-red-300 font-mono">makjang.md</code>를 적용하며 공통 규칙을 중복 전송하지 않습니다.
            <br />
            • <strong>단일 API 호출:</strong> 사회자 판단·묘사·캐릭터 대사를 한 번의 API 호출로 처리하며 안내 라비에는 적용하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
