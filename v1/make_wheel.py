# -*- coding: utf-8 -*-
'''
nltk.download('maxent_treebank_pos_tagger')
nltk.download('wordnet')
'''
import re
import codecs
import json
import nltk
from nltk.corpus import wordnet as wn
from nltk.stem.wordnet import WordNetLemmatizer


class Memo(object):
    def __init__(self):
        self.count = 0
        self.nodes = []


lemmatizer = WordNetLemmatizer()
# http://nltk.googlecode.com/svn/trunk/doc/book/ch05.html#tab-simplified-tagset
stoptags = ('CNJ', 'DET', 'EX', 'PRO', 'P', 'TO', 'WH')
stopwords = ('be', 'is', 'are', 'being', 'have', 'did', 'do', 'feeling', 'emotional', 'emotion', 'one', 'state')
stopchar_re = re.compile(r"[()\'\"`,.*]")
remark_start = '(now used only'


def get_wordnet_pos(treebank_tag):
    if treebank_tag.startswith('J'):
        return wn.ADJ
    elif treebank_tag.startswith('V'):
        return wn.VERB
    elif treebank_tag.startswith('N'):
        return wn.NOUN
    elif treebank_tag.startswith('R'):
        return wn.ADV
    else:
        return wn.NOUN


def tokenize(definition):
    remarks = definition.split(remark_start)
    if len(remarks) > 1:
        definition = remarks[0]
    text = [stopchar_re.sub('', term) for term in nltk.word_tokenize(definition)]
    for term, pos in nltk.pos_tag(text):
        lemma = lemmatizer.lemmatize(term, get_wordnet_pos(pos))
        if len(lemma) < 2 or (lemma in stopwords):
            continue
        pos = nltk.tag.simplify.simplify_wsj_tag(pos)
        if pos in stoptags:
            continue
        yield lemma


def make_node(name, memo):
    synset = wn.synset(name) if isinstance(name, (str, unicode)) else name
    children = []
    terms = memo.translator.definition(synset)
    node = dict(name=memo.translator.name(synset), terms=terms)
    for hypo in synset.hyponyms():
        child = make_node(hypo, memo)
        terms.extend(child['terms'])
        children.append(child)
    if children:
        node['children'] = children
    memo.count += 1
    memo.nodes.append(node)
    return node


class EnglishTranslator(object):
    def definition(self, synset):
        return list(tokenize(synset.definition))

    def name(self, synset):
        return synset.name.split('.')[0]


class JapaneseTranslator(EnglishTranslator):
    def __init__(self):
        import MeCab
        from wnja import JapaneseWordNetTranslator
        self._wn_translator = JapaneseWordNetTranslator('wnjpn-ok.tab', 'wnjpn-def.tab')
        self._tagger = MeCab.Tagger(' '.join(('--node-format=%m', '--unk-format=%m')))

    def definition(self, synset):
        default = lambda: super(JapaneseTranslator, self).definition(synset)
        definition = self._wn_translator.lookup_definition(synset.pos, synset.offset)
        if not definition:
            return default()
        return list(self.tokenize(definition))

    def name(self, synset):
        default_name = super(JapaneseTranslator, self).name(synset)
        return self._wn_translator.lookup_word(synset.pos, synset.offset, default_name)

    stopwords = tuple()
    gotags = (u'動詞', u'名詞', u'形容詞', u'形容動詞')

    def tokenize(self, sent):
        try:
            m = self._tagger.parseToNode(sent.encode('utf-8'))
        except:
            print sent
            print sent.__class__
            raise
        stopwords = self.stopwords
        gotags = self.gotags
        while m:
            try:
                term = m.surface.decode('utf-8')
            except UnicodeDecodeError:
                m = m.next
                continue
            pos = m.feature.decode('utf-8').split(',')[0]
            m = m.next

            term = stopchar_re.sub('', term)

            if len(term) < 2 or (term in stopwords):
                continue
            if pos not in gotags:
                continue

            yield term


def make_wheel(roots, lang='en'):
    nodes = []
    memo = Memo()
    memo.translator = EnglishTranslator()
    if lang == 'ja':
        memo.translator = JapaneseTranslator()
    for root, color in roots:
        node = make_node(root, memo)
        node['colour'] = color
        node['ekman_basic'] = True
        nodes.append(node)

    node_docs = [map(lambda t: t.encode('utf-8'), node['terms']) for node in memo.nodes]
    collection = nltk.TextCollection(node_docs)
    terms = []
    for i, node_doc in enumerate(node_docs):
        node = memo.nodes[i]
        name = node['name']
        tfidfs = reversed(sorted([
            (collection.tf_idf(term.encode('utf-8'), node_doc), term)
            for term in list(set(node['terms']))]))
        for tfidf, term in tfidfs:
            terms.append(dict(node=name, tfidf=tfidf, term=term))

    with open('wheel{}.json'.format(('_' + lang) if lang else ''), 'w') as f:
        f.write(json.dumps(
            dict(nodes=nodes, terms=terms),
            indent=2,
        ))


if __name__ == '__main__':
    ekman_basics = [
        ('happiness.n.02', '#ffffb1'),
        ('anger.n.01', '#ff8c8c'),
        ('disgust.n.01', '#ffc6ff'),
        ('fear.n.01', '#8cc68c'),
        ('sadness.n.01', '#8c8cff'),
        ('astonishment.n.01', '#a5dbff'),
    ]
    make_wheel(ekman_basics, lang='ja')
    make_wheel(ekman_basics)
