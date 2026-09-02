#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pdfjs_root="${project_root}/node_modules/pdfjs-dist"
output_root="${project_root}/public/pdfjs"

mkdir -p "${output_root}/wasm" "${output_root}/cmaps" "${output_root}/standard_fonts" "${output_root}/iccs"
cp -a "${pdfjs_root}/cmaps/." "${output_root}/cmaps/"
cp -a "${pdfjs_root}/standard_fonts/." "${output_root}/standard_fonts/"
cp -a "${pdfjs_root}/iccs/." "${output_root}/iccs/"
cp -a "${pdfjs_root}/wasm/openjpeg.wasm" "${pdfjs_root}/wasm/qcms_bg.wasm" "${output_root}/wasm/"
