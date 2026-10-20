"use client";

import { useMemo, useState } from "react";
import { Columns2, Rows3 } from "lucide-react";

/**
 * Diff de README no estilo do GitHub: comparação linha a linha entre o README
 * atual ("antes") e o proposto ("depois"), com destaque de adições/remoções.
 *
 * O algoritmo é uma LCS (Longest Common Subsequence) por linha — o mesmo modelo
 * que o GitHub usa para diffs de texto. READMEs têm poucas centenas de linhas,
 * então o custo O(n*m) da tabela de programação dinâmica é irrelevante.
 */

type DiffType = "context" | "add" | "remove";
type DiffOp = {
  type: DiffType;
  text: string;
  oldNo: number | null;
  newNo: number | null;
};

function diffLines(oldText: string, newText: string): DiffOp[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;

  // dp[i][j] = tamanho da LCS entre a[i:] e b[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "context", text: a[i], oldNo: oldNo++, newNo: newNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", text: a[i], oldNo: oldNo++, newNo: null });
      i++;
    } else {
      ops.push({ type: "add", text: b[j], oldNo: null, newNo: newNo++ });
      j++;
    }
  }
  while (i < n) ops.push({ type: "remove", text: a[i++], oldNo: oldNo++, newNo: null });
  while (j < m) ops.push({ type: "add", text: b[j++], oldNo: null, newNo: newNo++ });
  return ops;
}

type SplitCell = { no: number | null; text: string | null; type: DiffType | "empty" };
type SplitRow = { left: SplitCell; right: SplitCell };

function toSplitRows(ops: DiffOp[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let rem: DiffOp[] = [];
  let add: DiffOp[] = [];

  const flush = () => {
    const max = Math.max(rem.length, add.length);
    for (let k = 0; k < max; k++) {
      const r = rem[k];
      const a = add[k];
      rows.push({
        left: r
          ? { no: r.oldNo, text: r.text, type: "remove" }
          : { no: null, text: null, type: "empty" },
        right: a
          ? { no: a.newNo, text: a.text, type: "add" }
          : { no: null, text: null, type: "empty" },
      });
    }
    rem = [];
    add = [];
  };

  for (const op of ops) {
    if (op.type === "remove") rem.push(op);
    else if (op.type === "add") add.push(op);
    else {
      flush();
      rows.push({
        left: { no: op.oldNo, text: op.text, type: "context" },
        right: { no: op.newNo, text: op.text, type: "context" },
      });
    }
  }
  flush();
  return rows;
}

const LINE_BG: Record<DiffType | "empty", string> = {
  add: "bg-emerald-500/10",
  remove: "bg-rose-500/10",
  context: "",
  empty: "bg-black/20",
};
const LINE_TEXT: Record<DiffType | "empty", string> = {
  add: "text-emerald-200",
  remove: "text-rose-200",
  context: "text-zinc-400",
  empty: "text-transparent",
};
const SIGN: Record<DiffType, string> = { add: "+", remove: "−", context: " " };

export default function ReadmeDiffView({
  oldText,
  newText,
}: {
  oldText: string;
  newText: string;
}) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const ops = useMemo(() => diffLines(oldText, newText), [oldText, newText]);
  const splitRows = useMemo(
    () => (mode === "split" ? toSplitRows(ops) : []),
    [ops, mode],
  );

  const additions = ops.filter((o) => o.type === "add").length;
  const removals = ops.filter((o) => o.type === "remove").length;
  const identical = additions === 0 && removals === 0;

  return (
    <div className="flex flex-col">
      {/* Barra de status do diff */}
      <div className="flex items-center justify-between gap-3 border-b border-stroke px-4 py-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-emerald-300">+{additions}</span>
          <span className="font-mono text-rose-300">−{removals}</span>
          {identical ? (
            <span className="text-zinc-500">
              Sem diferenças em relação ao README atual.
            </span>
          ) : null}
        </div>

        {/* Alternância Unified / Split (igual ao GitHub) */}
        <div className="flex overflow-hidden rounded-lg border border-stroke">
          <button
            type="button"
            onClick={() => setMode("unified")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
              mode === "unified"
                ? "bg-brand/10 text-brand"
                : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            <Rows3 className="size-3.5" strokeWidth={1.75} aria-hidden />
            Unificado
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`inline-flex items-center gap-1.5 border-l border-stroke px-3 py-1.5 text-xs font-medium transition ${
              mode === "split"
                ? "bg-brand/10 text-brand"
                : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            <Columns2 className="size-3.5" strokeWidth={1.75} aria-hidden />
            Lado a lado
          </button>
        </div>
      </div>

      {/* Corpo do diff */}
      <div className="h-[600px] overflow-auto rounded-b-lg bg-black/40 font-mono text-xs leading-relaxed">
        {mode === "unified" ? (
          <table className="w-full border-collapse">
            <tbody>
              {ops.map((op, idx) => (
                <tr key={idx} className={LINE_BG[op.type]}>
                  <td className="select-none border-r border-stroke/40 px-1 text-right align-top text-[11px] text-zinc-600">
                    {op.oldNo ?? ""}
                  </td>
                  <td className="select-none border-r border-stroke/40 px-1 text-right align-top text-[11px] text-zinc-600">
                    {op.newNo ?? ""}
                  </td>
                  <td
                    className={`select-none px-2 text-center align-top ${LINE_TEXT[op.type]}`}
                  >
                    {SIGN[op.type]}
                  </td>
                  <td
                    className={`whitespace-pre-wrap break-words px-2 align-top ${LINE_TEXT[op.type]}`}
                  >
                    {op.text || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {splitRows.map((row, idx) => (
                <tr key={idx}>
                  {/* Coluna esquerda (atual) */}
                  <td
                    className={`w-[9%] select-none border-r border-stroke/40 px-1 text-right align-top text-[11px] text-zinc-600 ${LINE_BG[row.left.type]}`}
                  >
                    {row.left.no ?? ""}
                  </td>
                  <td
                    className={`w-[41%] whitespace-pre-wrap break-words px-2 align-top ${LINE_BG[row.left.type]} ${LINE_TEXT[row.left.type]}`}
                  >
                    {row.left.text != null ? row.left.text || " " : ""}
                  </td>
                  {/* Coluna direita (proposto) */}
                  <td
                    className={`w-[9%] select-none border-l border-r border-stroke/40 px-1 text-right align-top text-[11px] text-zinc-600 ${LINE_BG[row.right.type]}`}
                  >
                    {row.right.no ?? ""}
                  </td>
                  <td
                    className={`w-[41%] whitespace-pre-wrap break-words px-2 align-top ${LINE_BG[row.right.type]} ${LINE_TEXT[row.right.type]}`}
                  >
                    {row.right.text != null ? row.right.text || " " : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
