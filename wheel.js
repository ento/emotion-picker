/* init */
var width = 760,
    height = width,
    radius = width / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
    termY = d3.scale.ordinal(),
    padding = 5,
    duration = 1000;

var div = d3.select("#vis"),
  aside = d3.select("#related");

div.select("img").remove();

var vis = div.append("svg")
    .attr("width", width + padding * 2)
    .attr("height", height + padding * 2)
  .append("g")
    .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

var rels = aside.append("svg")
    .attr("width", 100)
    .attr("height", height + padding * 2)
  .append("g")
    .attr("transform", "translate(" + [0, padding] + ")");

div.append("p")
    .attr("id", "intro")
    .text("Click to zoom!");

var partition = d3.layout.partition()
    .sort(null)
    .value(function(d) { return 5.8 - d.depth; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

/* build visualization */

d3.json("wheel_ja.json", function(error, json) {
  var nodes = partition.nodes({children: json.nodes}),
    terms = aggregateTerms(json.terms);

//  termY.domain([0, terms.termList.length]).range([0, terms.termList.length * 20]);
  termY.rangeBands([0, terms.termList.length * 20]);
  termY.domain(_.pluck(terms.termList, 'term'));

  var path = vis.selectAll("path").data(nodes);
  path.enter().append("path")
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", colour)
      .on("click", click);

  var text = vis.selectAll("text").data(nodes);
  var textEnter = text.enter().append("text")
      .style("fill-opacity", 1)
      .style("fill", function(d) {
        return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
      })
      .attr("text-anchor", function(d) {
        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
      })
      .attr("dy", ".2em")
      .attr("transform", function(d) {
        var multiline = (d.name || "").split(" ").length > 1,
            angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = angle + (multiline ? -.5 : 0);
        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
      })
      .on("click", click);
  textEnter.append("tspan")
      .attr("x", 0)
      .text(function(d) { return d.depth ? d.name.split(" ")[0] : ""; });
  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1em")
      .text(function(d) { return d.depth ? d.name.split(" ")[1] || "" : ""; });

  var termCount = terms.termList.length;
  var tfidfColor = d3.scale.linear()
    .domain([terms.termList[0].tfidf, terms.termList[termCount - 1]])
    .range(['#000', '#999']);

  var termIdentity = function(d) { return d.term; };
  var termText = rels.selectAll("text").data(terms.termList, termIdentity);
  termEnter = termText.enter().append("text")
      .style("fill-opacity", 1)
      .attr("text-anchor", function(d) {
        return "start";
      })
      .attr("dy", ".5em")
      .text(function(d) { return d.term; })
      .on('click', function(d) {
        createFilter({type: 'keyword', value: d.term});
      })
      .call(updateTerm);

  function updateTerm(selection) {
    selection
      .transition().duration(duration)
      .style("fill", function(d) { return tfidfColor(d.tfidf); })
      .style("opacity", function(d) { return d.tfidf == 0 ? 0 : 1; })
      .attr("y", function(d) { return termY(d.term); })
  }

  var selected = null;

  function select(target, d) {
    if (!d.name) { return; }
    if (selected && selected) {
      deselect(target, selected);
    }
    selected = d;
    var termTfidfs = terms.nodeTerms[d.name]
    var sortedTerms = _.chain(terms.termList)
      .map(function(each) {
        return {term: each.term, tfidf: termTfidfs[each.term] || 0}
      })
      .sortBy(function(each) {
        return -each.tfidf;
      })
      .value();
    termY.domain(_.pluck(sortedTerms, 'term'));
    rels.selectAll("text").data(sortedTerms, termIdentity).call(updateTerm);
  }

  function deselect(target, d) {
    selected = null;
  }

  function click(d) {
    if (d.name) {
      if (selected !== d) {
        select(this, d);
        return;
      }
      deselect(this, d);
    }
    path.transition()
      .duration(duration)
      .attrTween("d", arcTween(d));

    // Somewhat of a hack as we rely on arcTween updating the scales.
    text.style("visibility", function(e) {
          return isParentOf(d, e) ? null : d3.select(this).style("visibility");
        })
      .transition()
        .duration(duration)
        .attrTween("text-anchor", function(d) {
          return function() {
            return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
          };
        })
        .attrTween("transform", function(d) {
          var multiline = (d.name || "").split(" ").length > 1;
          return function() {
            var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                rotate = angle + (multiline ? -.5 : 0);
            return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
          };
        })
        .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
        .each("end", function(e) {
          d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
        });
  }
  Filters.fetch();
});

/* filters */

function initFilterFields(fields) {
  var div = d3.select('#filters');
  div.append('button').html('add').on('click', function(e) {
    createFilter(fields[parseInt(d3.select('#filter-type').node().selectedOptions[0].value)])
  });
  div.append('select')
    .attr('id', 'filter-type')
  .selectAll('option').data(fields)
    .enter()
    .append('option')
    .attr('value', function(d, i) { return i; })
    .html(function(d) { return d.label; });
  div.append('ol')
    .attr('id', 'filter-list');
}

function createFilter(field) {
  Filters.create({type: field.type, value: field.value, label: field.label});
}

var fields = [
  {
    type: 'bool',
    label: "Ekman's basic emotions",
    value: 'ekman_basic'
  },
  {
    type: 'keyword',
    label: 'Keyword'
  }  
];
initFilterFields(fields);

/* filter models */

var fw = {};
fw.filter = {};

fw.filter.bool = Backbone.Model.extend({
  defaults: {
    type: 'bool'
  },
  match: function(d) {
    return !!d[this.get('value')];
  },
});

fw.filter.keyword = Backbone.Model.extend({
  defaults: {
    type: 'keyword',
    label: 'Keyword'
  },
  match: function(d) {
    if (!d.terms) return;
    return d.terms.indexOf(this.get('value')) !== -1;
  },
});

var FilterCollection = Backbone.Collection.extend({
  localStorage: new Backbone.LocalStorage("feelings-wheel"),
  model: function(attrs, options) {
    return new fw.filter[attrs.type](attrs, options);
  }
});

var Filters = new FilterCollection();
function viewOneFilter(model) {
  var view = new FilterView({model: model});
  Backbone.$("#filter-list").append(view.render().el);
}
Filters.on('add', function(model) {
  viewOneFilter(model);
});
Filters.on('reset', function() {
  Filters.each(viewOneFilter);
});
Filters.on('all', highlightMatches);

/* filter view */

var FilterView = Backbone.View.extend({
  tagName: "li",
  templates: {
    bool: _.template(d3.select('#bool-template').html()),
    keyword: _.template(d3.select('#keyword-template').html())
  },
  events: {
    'change input': 'updateFilter',
    'click a.destroy' : 'clear',
  },
  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'destroy', this.remove);
  },
  render: function() {
    this.$el.html(this.templates[this.model.get('type')](this.model.toJSON()));
    this.input = this.$('input');
    return this;
  },
  clear: function() {
    this.model.destroy();
  },
  updateFilter: function() {
    this.model.save({value: this.input.val()})
    highlightMatches();
  }
});

function match(d) {
  if (!Filters.length) {
    return false;
  }
  return Filters.every(function(each) {
    return each.match(d);
  });
}

function highlightMatches() {
  vis.selectAll("path").classed('match', function(d) {
    var matches = match(d);
    return matches;
  });
}

/* terms */

function tfidfDescending(a, b) {
  return a.tfidf > b.tfidf;
}

function aggregateTerms(terms) {
  var nodeTerms = {},
    termNodes = {},
    termTfidfs = {};
  terms.forEach(function(each) {
    nodeTerms[each.node] = nodeTerms[each.node] || {};
    nodeTerms[each.node][each.term] = each.tfidf;

    termNodes[each.term] = termNodes[each.term] || {};
    termNodes[each.term][each.node] = each.tfidf;

    if (!termTfidfs[each.term] || (termTfidfs[each.term] < each.tfidf)) {
      termTfidfs[each.term] = each.tfidf;
    }
  });
  termList = [];
  for (var term in termTfidfs) {
    termList.push({term: term, tfidf: termTfidfs[term]});
  }
  termList.sort(tfidfDescending);
  return {nodeTerms: nodeTerms, termNodes: termNodes, termList: termList};
}

/* node helpers */

function isParentOf(p, c) {
  if (p === c) return true;
  if (p.children) {
    return p.children.some(function(d) {
      return isParentOf(d, c);
    });
  }
  return false;
}

function colour(d) {
  if (d.colour) {
    return d3.rgb(d.colour);
  }
  if (d.children) {
    // There is a maximum of two children!
    var colours = d.children.map(colour),
        a = d3.hsl(colours[0]),
        b = d3.hsl(colours[1]);
    // L*a*b* might be better here...
    return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
  }
  return d.colour || "#fff";
}

// Interpolate the scales!
function arcTween(d) {
  var my = maxY(d),
      xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, my]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
  return function(d) {
    return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}

function maxY(d) {
  return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
}

// http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
function brightness(rgb) {
  return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
}
