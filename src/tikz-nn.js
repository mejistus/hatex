// TikZ preamble for neural-network diagrams.
//
// It is added to a picture's preamble automatically when the picture uses any
// nn* style or the \usennstyles marker, so posts can draw architectures without
// carrying a preamble around:
//
//   \begin{tikzpicture}[nn]
//     \node[nnconv] (c1) {Conv 3×3\\64};
//     \node[nnpool, right=of c1] (p1) {Max pool};
//     \draw[nnflow] (c1) -- (p1);
//   \end{tikzpicture}
//
// Styles: nnconv nnpool nnfc nnact nnnorm nnattn nnembed nnout nndata nnloss
//         (layers), nnflow nnskip nnback (arrows), nngroup nnbrace (grouping),
//         and the pic "nnfeatmap" for a 3-D feature-map block.
(function () {
  'use strict';

  window.TIKZ_NN_PREAMBLE = String.raw`
\definecolor{nnconvc}{HTML}{8AAA8C}
\definecolor{nnpoolc}{HTML}{C47C5A}
\definecolor{nnfcc}{HTML}{6E8CA8}
\definecolor{nnactc}{HTML}{C9A227}
\definecolor{nnnormc}{HTML}{9B8AA6}
\definecolor{nnattnc}{HTML}{4F8A8B}
\definecolor{nnembedc}{HTML}{B0836A}
\definecolor{nnoutc}{HTML}{7A9E7E}
\definecolor{nndatac}{HTML}{8A8278}
\definecolor{nnlossc}{HTML}{B3524B}
\tikzset{
  nn/.style={
    font=\small,
    node distance=8mm and 10mm,
    every node/.append style={align=center},
  },
  nnbox/.style 2 args={
    draw=#1!75!black, fill=#1!18, rounded corners=2pt, align=center,
    inner sep=3pt, minimum width=#2, minimum height=8mm, font=\small,
  },
  nnconv/.style={nnbox={nnconvc}{16mm}},
  nnpool/.style={nnbox={nnpoolc}{14mm}},
  nnfc/.style={nnbox={nnfcc}{16mm}},
  nnact/.style={nnbox={nnactc}{12mm}},
  nnnorm/.style={nnbox={nnnormc}{14mm}},
  nnattn/.style={nnbox={nnattnc}{18mm}},
  nnembed/.style={nnbox={nnembedc}{16mm}},
  nnout/.style={nnbox={nnoutc}{16mm}},
  nnloss/.style={nnbox={nnlossc}{14mm}},
  nndata/.style={
    draw=nndatac!75!black, fill=nndatac!15, align=center, font=\small,
    trapezium, trapezium left angle=70, trapezium right angle=110,
    minimum width=14mm, minimum height=8mm, inner sep=3pt,
  },
  nnsum/.style={
    draw=black!65, fill=white, circle, inner sep=0pt, minimum size=5mm, font=\footnotesize,
  },
  nnflow/.style={-{Stealth[length=2mm,width=1.6mm]}, draw=black!65, thick},
  nnskip/.style={nnflow, dashed, rounded corners=3mm},
  nnback/.style={nnflow, draw=nnlossc!80!black, dashed},
  nnlabel/.style={font=\scriptsize, text=black!60, inner sep=1.5pt},
  nngroup/.style={draw=black!30, dashed, rounded corners=4pt, inner sep=3.5mm},
  nngrouplabel/.style={font=\scriptsize\itshape, text=black!55},
  nnbrace/.style={decorate, decoration={brace, amplitude=4pt, raise=1pt}, draw=black!45},
  % 3-D feature map: \pic[…] (name) {nnfeatmap={w=1.2, h=2, d=0.5, fill=nnconvc, label=64}};
  nnfeatmap/.pic={
    \tikzset{nnfm/.cd, #1}
    \def\w{\pgfkeysvalueof{/tikz/nnfm/w}}
    \def\h{\pgfkeysvalueof{/tikz/nnfm/h}}
    \def\d{\pgfkeysvalueof{/tikz/nnfm/d}}
    \def\c{\pgfkeysvalueof{/tikz/nnfm/fill}}
    \fill[\c!22, draw=\c!70!black] (0,0) rectangle (\w,\h);
    \fill[\c!38, draw=\c!70!black] (0,\h) -- (\d,\h+\d) -- (\w+\d,\h+\d) -- (\w,\h) -- cycle;
    \fill[\c!30, draw=\c!70!black] (\w,0) -- (\w+\d,\d) -- (\w+\d,\h+\d) -- (\w,\h) -- cycle;
    \node[font=\scriptsize, text=black!70] at (\w/2,-0.28) {\pgfkeysvalueof{/tikz/nnfm/label}};
  },
  nnfm/.cd, w/.initial=1.2, h/.initial=2, d/.initial=0.5, fill/.initial=nnconvc, label/.initial={},
}
`;
})();
