# MSPM0 Pin Planner v1.2.0

- Release date: 2026-07-19
- Single-file portable build: MSPM0-Pin-Planner-1.2.0-Portable.exe
- Fast-start folder build: MSPM0-Pin-Planner-1.2.0-Folder
- Offline web build: mspm0g3519-pin-planner.html
- Copy the entire folder build when using or distributing it; do not copy only its EXE.
- This build is not commercially code-signed
- See the project CHANGELOG.md for details

## Highlights

- Adds official RHB-32 and RGZ-48 VQFN packages for MSPM0G3507 and MSPM0G3519.
- Pin data is based on TI SLASEX6C and SLASFA2B, both revised October 2025.
- Preserves existing LQFP pin data and v3/v4 project compatibility.
- Fixes GPIO search prefix matching so `PB1` no longer highlights `PB10`, `PB11`, or `PB12`.
