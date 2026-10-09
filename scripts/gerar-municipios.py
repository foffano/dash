#!/usr/bin/env python3
"""Gera public/municipios.json: população de cada município (IBGE, Censo 2022) e capitais.

Formato: {"UF": {"nomenormalizado": [populacao, capital(0/1)]}}. O nome é normalizado
como a função norm() do painel (sem acento, minúsculo, só letras e números).

Uso:  python3 scripts/gerar-municipios.py
"""
import json
import re
import unicodedata
import urllib.request
from pathlib import Path

URL = 'https://apisidra.ibge.gov.br/values/t/4709/n6/all/v/93/p/2022'
CAPITAIS = {
    'AC': 'Rio Branco', 'AL': 'Maceió', 'AP': 'Macapá', 'AM': 'Manaus', 'BA': 'Salvador',
    'CE': 'Fortaleza', 'DF': 'Brasília', 'ES': 'Vitória', 'GO': 'Goiânia', 'MA': 'São Luís',
    'MT': 'Cuiabá', 'MS': 'Campo Grande', 'MG': 'Belo Horizonte', 'PA': 'Belém', 'PB': 'João Pessoa',
    'PR': 'Curitiba', 'PE': 'Recife', 'PI': 'Teresina', 'RJ': 'Rio de Janeiro', 'RN': 'Natal',
    'RS': 'Porto Alegre', 'RO': 'Porto Velho', 'RR': 'Boa Vista', 'SC': 'Florianópolis',
    'SP': 'São Paulo', 'SE': 'Aracaju', 'TO': 'Palmas',
}


def norm(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]', '', s)


def main():
    with urllib.request.urlopen(URL, timeout=120) as r:
        rows = json.load(r)[1:]
    out = {}
    for row in rows:
        name, uf = row['D1N'].rsplit(' - ', 1)
        pop = int(row['V'])
        cap = 1 if norm(CAPITAIS[uf]) == norm(name) else 0
        out.setdefault(uf, {})[norm(name)] = [pop, cap]
    assert sum(v[1] for m in out.values() for v in m.values()) == 27, 'capitais não encontradas'
    dest = Path(__file__).resolve().parent.parent / 'public' / 'municipios.json'
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':'), sort_keys=True))
    print(f'{sum(len(m) for m in out.values())} municípios em {dest}')


if __name__ == '__main__':
    main()
