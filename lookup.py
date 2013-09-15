# -*- coding: utf-8 -*-
import sys
from pprint import pprint
from nltk.corpus import wordnet as wn


hyp_rel = lambda s: s.hypernyms()


def lookup(word):
    synsets = wn.synsets(word, wn.NOUN)
    for s in synsets:
        print s.definition
        pprint(s.tree(hyp_rel))
        print '-' * 50


if __name__ == '__main__':
    for arg in sys.argv[1:]:
        lookup(arg)
