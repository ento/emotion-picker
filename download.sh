#!/bin/sh

curl http://nlpwww.nict.go.jp/wn-ja/data/1.1/wnjpn-ok.tab.gz | gunzip > wnjpn-ok.tab
curl http://nlpwww.nict.go.jp/wn-ja/data/1.1/wnjpn-def.tab.gz | gunzip > wnjpn-def.tab

# brew install mecab mecab-ipadic
