# -*- coding: utf-8 -*-
'''
Utilities for using Japanese WordNet database:
http://nlpwww.nict.go.jp/wn-ja/

Tested with files from:
http://nlpwww.nict.go.jp/wn-ja/data/1.1/
'''
import codecs


class JapaneseWordNetTranslator(object):
    def __init__(self, words_filename, defs_filename):
        '''
        words_filename: path to wnjpn-ok.tab
        defs_filename: path to wnjpn-def.tab
        '''
        import codecs
        with codecs.open(words_filename, encoding="utf-8") as f:
            self._load_words(f)
        with codecs.open(defs_filename, encoding="utf-8") as f:
            self._load_defs(f)

    def _load_words(self, f):
        self._offset_pos_words = offset_pos_words = {}
        for line in f:
            cells = line.strip().split('\t')
            offset_pos = cells[0]
            word = cells[1]
            if len(cells) > 2:
                tag = cells[2]
            offset, pos = offset_pos.split('-')
            offset_pos_words[(int(offset), pos)] = word

    def _load_defs(self, f):
        self._offset_pos_defs = offset_pos_defs = {}
        for line in f:
            cells = line.strip().split('\t')
            offset_pos = cells[0]
            i = cells[1]
            if len(cells) > 3:
                definition = cells[3]
            offset, pos = offset_pos.split('-')
            offset_pos_defs[(int(offset), pos)] = definition

    def _lookup(self, mapping, pos, offset, default):
        rv = mapping.get((offset, pos), None)
        if not rv:
            if callable(default):
                return default()
            return default
        return rv

    def lookup_definition(self, pos, offset, default=None):
        return self._lookup(self._offset_pos_defs, pos, offset, default)

    def lookup_word(self, pos, offset, default=None):
        return self._lookup(self._offset_pos_words, pos, offset, default)
