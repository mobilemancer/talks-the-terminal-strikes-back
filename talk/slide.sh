#!/usr/bin/env bash

# The Terminal Strikes Back — Talk intro slide
# Usage: bash slide.sh [--no-animation]

ANIMATE=true
[[ "${1:-}" == "--no-animation" ]] && ANIMATE=false

# ── ANSI ───────────────────────────────────────────────────────
R=$'\033[0m'
BD=$'\033[1m'
DM=$'\033[2m'
BCYN=$'\033[96m'
BYLW=$'\033[93m'
BWHT=$'\033[97m'
BGRN=$'\033[92m'
GRN=$'\033[32m'
CYN=$'\033[36m'
BBLK=$'\033[90m'
BBLU=$'\033[94m'

# ── Block font (5 rows × 7 cols per glyph, box-drawing outline) ──
declare -A F
F[A,0]="  ┌─┐  "; F[A,1]=" ┌┘ └┐ "; F[A,2]="┌┘   └┐"; F[A,3]="├─────┤"; F[A,4]="│     │"
F[B,0]="├─────┐"; F[B,1]="│     │"; F[B,2]="├─────┤"; F[B,3]="│     │"; F[B,4]="├─────┘"
F[C,0]="┌─────┐"; F[C,1]="│      "; F[C,2]="│      "; F[C,3]="│      "; F[C,4]="└─────┘"
F[E,0]="┌─────┐"; F[E,1]="│      "; F[E,2]="├────  "; F[E,3]="│      "; F[E,4]="└─────┘"
F[H,0]="│     │"; F[H,1]="│     │"; F[H,2]="├─────┤"; F[H,3]="│     │"; F[H,4]="│     │"
F[I,0]="┌─────┐"; F[I,1]="   │   "; F[I,2]="   │   "; F[I,3]="   │   "; F[I,4]="└─────┘"
F[K,0]="│    ┌ "; F[K,1]="│   ┌┘ "; F[K,2]="├─┌┘   "; F[K,3]="│   └┐ "; F[K,4]="│    └ "
F[L,0]="│      "; F[L,1]="│      "; F[L,2]="│      "; F[L,3]="│      "; F[L,4]="└─────┘"
F[M,0]="┌─┐ ┌─┐"; F[M,1]="│ └─┘ │"; F[M,2]="│     │"; F[M,3]="│     │"; F[M,4]="└─────┘"
F[N,0]="┌─┐   │"; F[N,1]="│ └┐  │"; F[N,2]="│  └┐ │"; F[N,3]="│   └┐│"; F[N,4]="│    └┘"
F[R,0]="┌─────┐"; F[R,1]="│     │"; F[R,2]="├─────┘"; F[R,3]="│  └┐  "; F[R,4]="│    └─"
F[S,0]="┌─────┐"; F[S,1]="│      "; F[S,2]="└─────┐"; F[S,3]="      │"; F[S,4]="┌─────┘"
F[T,0]="┌──┬──┐"; F[T,1]="   │   "; F[T,2]="   │   "; F[T,3]="   │   "; F[T,4]="   │   "

# Compute visual width of block text from input string
# Formula: letters*8 - 1 + spaces*4  (each glyph is 7 wide + 1 gap; word gap = 4)
block_visual_width() {
  local text="$1"
  local letters=0 spaces=0 i ch
  for (( i=0; i<${#text}; i++ )); do
    ch="${text:$i:1}"
    [[ "$ch" == " " ]] && (( spaces++ )) || (( letters++ ))
  done
  echo $(( letters * 8 - 1 + spaces * 4 ))
}

# Build 5-row block text into global BROWS[]
BROWS=()
mk_block() {
  BROWS=("" "" "" "" "")
  local i ch uch r
  for (( i=0; i<${#1}; i++ )); do
    ch="${1:$i:1}"
    if [[ "$ch" == " " ]]; then
      for r in 0 1 2 3 4; do BROWS[$r]+="    "; done
    else
      uch="${ch^^}"
      for r in 0 1 2 3 4; do BROWS[$r]+="${F[$uch,$r]} "; done
    fi
  done
  # trim trailing space
  for r in 0 1 2 3 4; do BROWS[$r]="${BROWS[$r]% }"; done
}


# ── Helpers ────────────────────────────────────────────────────
COLS=$(tput cols  2>/dev/null || echo 120)
ROWS=$(tput lines 2>/dev/null || echo 40)

pause() { $ANIMATE && sleep "${1:-0.1}" || true; }

type_print() {
  local text="$1" color="$2" delay="${3:-0.04}"
  echo -ne "$color"
  if $ANIMATE; then
    local i
    for (( i=0; i<${#text}; i++ )); do
      echo -ne "${text:$i:1}"
      sleep "$delay"
    done
  else
    echo -ne "$text"
  fi
  echo -e "$R"
}

# ── Setup ──────────────────────────────────────────────────────
trap 'printf "\033[?25h$R\n"' EXIT INT TERM
printf '\033[?25l'   # hide cursor
printf '\033[2J\033[H'  # clear screen

# ── Phase 1: Starfield ─────────────────────────────────────────
STARS=('·' '✦' '✧' '⊹' '*' '˚' '°' '•' '⋆' '∘' '+' '✸')
MAX_STAR_ROW=$ROWS

for (( i=0; i<70; i++ )); do
  sr=$(( RANDOM % MAX_STAR_ROW + 1 ))
  sc=$(( RANDOM % (COLS - 2) + 1 ))
  st="${STARS[$(( RANDOM % ${#STARS[@]} ))]}"
  case $(( RANDOM % 4 )) in
    0) stc="${DM}${BBLK}" ;;
    1) stc="${BBLK}"      ;;
    2) stc="${BBLU}"      ;;
    *) stc="${DM}${BWHT}" ;;
  esac
  printf '\033[%d;%dH%s' "$sr" "$sc" "${stc}${st}${R}"
done

pause 0.2

# ── Phase 2: "THE TERMINAL" block title ───────────────────────
mk_block "THE TERMINAL"
tw=$(block_visual_width "THE TERMINAL")
sc=$(( (COLS - tw) / 2 )); [[ $sc -lt 1 ]] && sc=1
T1R=$(( ROWS / 2 - 8 )); [[ $T1R -lt 2 ]] && T1R=2

for (( r=0; r<5; r++ )); do
  printf '\033[%d;%dH' $(( T1R + r )) "$sc"
  echo -ne "${BD}${BCYN}${BROWS[$r]}${R}"
  pause 0.02
done

pause 0.06

# ── Phase 3: "STRIKES BACK" block title ───────────────────────
mk_block "STRIKES BACK"
tw=$(block_visual_width "STRIKES BACK")
sc2=$(( (COLS - tw) / 2 )); [[ $sc2 -lt 1 ]] && sc2=1
T2R=$(( T1R + 6 ))

for (( r=0; r<5; r++ )); do
  printf '\033[%d;%dH' $(( T2R + r )) "$sc2"
  echo -ne "${BD}${BYLW}${BROWS[$r]}${R}"
  pause 0.02
done

pause 0.1

# ── Phase 4: Lightsaber divider ────────────────────────────────
SR=$(( T2R + 6 ))
SABER_START=3
SABER_W=$(( COLS - SABER_START - 1 ))
SCOLS=("$BGRN" "$GRN" "$BWHT" "$BGRN" "$GRN" "$BGRN")

printf '\033[%d;%dH' "$SR" "$SABER_START"
for (( i=0; i<SABER_W; i++ )); do
  ci=$(( i % ${#SCOLS[@]} ))
  if (( i == SABER_W - 1 )); then
    echo -ne "${BD}${BYLW}◈${R}"
  elif (( i % 10 == 0 )); then
    echo -ne "${BD}${BWHT}╸${R}"
  else
    echo -ne "${BD}${SCOLS[$ci]}━${R}"
  fi
  (( i % 5 == 0 )) && pause 0.002
done

pause 0.1

# ── Phase 5: Speaker info (typewriter) ────────────────────────
IR=$(( SR + 2 ))

# Line 1: Name with styling (centered)
name_text="✦ Andreas Wänqvist ✦"
name_len=${#name_text}
IC1=$(( (COLS - name_len) / 2 )); [[ $IC1 -lt 1 ]] && IC1=1
printf '\033[%d;%dH' "$IR" "$IC1"; type_print "$name_text" "${BD}${BWHT}" 0

pause 0.12

# Line 2: Title/Company (centered)
title_text="CTO Axonis  ◆  Microsoft MVP"
title_len=${#title_text}
IC2=$(( (COLS - title_len) / 2 )); [[ $IC2 -lt 1 ]] && IC2=1
printf '\033[%d;%dH' $(( IR + 1 )) "$IC2"; type_print "$title_text" "${CYN}" 0

pause 0.12

# Line 3: Web & LinkedIn (centered)
links_text="mobilemancer.com  ◆  linkedin.com/in/awanqvist"
links_len=${#links_text}
IC3=$(( (COLS - links_len) / 2 )); [[ $IC3 -lt 1 ]] && IC3=1
printf '\033[%d;%dH' $(( IR + 2 )) "$IC3"; type_print "$links_text" "${BGRN}" 0

# ── Promo: AI-Fokus conference ──────────────────────────────────
pause 0.2
PROMO="AI fokus - 2026"
PROMO_C=$(( (COLS - ${#PROMO}) / 2 ))
printf '\033[%d;%dH%s' $(( ROWS - 3 )) "$PROMO_C" "${BD}${BYLW}${PROMO}${R}"

# ── Footer: press any key ──────────────────────────────────────
pause 0.15
PROMPT="[ press any key ]"
FC=$(( (COLS - ${#PROMPT}) / 2 ))
printf '\033[%d;%dH%s' $(( ROWS - 1 )) "$FC" "${DM}${BBLK}${PROMPT}${R}"

read -r -s -n 1

# Clear screen
printf '\033[2J\033[H'
