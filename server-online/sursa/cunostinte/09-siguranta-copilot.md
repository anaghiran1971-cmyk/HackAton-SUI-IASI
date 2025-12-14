# Siguranță Copilot Wallet

## Ce NU face Copilotul
- nu cere seed phrase / private key
- nu semnează tranzacții în locul utilizatorului
- nu execută fără confirmare în wallet

## Ce face Copilotul
- parsează intenții
- rezolvă alias -> adresă
- evaluează riscuri
- explică tranzacții și obiecte
- blochează execuția la risc ridicat (safe-by-default)

## Reguli bune
- mainnet blocat implicit
- limită sumă transfer
- rate-limit + cheie API (când e public)
