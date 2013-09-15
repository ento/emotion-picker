# -*- coding: utf-8 -*-
import sys
import code
from nltk.corpus import wordnet as wn

if __name__ == '__main__':
    if sys.argv[1:]:
        s = wn.synsets(sys.argv[1])
        print s
    code.interact(local=globals())
