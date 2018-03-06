var margin = {top: 20, right: 20, bottom: 30, left: 50}
    , width = 1000 - margin.left - margin.right
    , height = 700 - margin.top - margin.bottom;


// COLORS
const black = '#3b444b'
const white = '#f9f9f9'
const demColor = '#232066'
const repColor = '#E91D0E'

// SCALES
var colorScale = d3.scaleLinear()
        .domain([-60, 0 , 60])
        .range([repColor, white, demColor])

var t_domain = [-65,-45,-25, -5,0, 5, 25, 45, 65]
var t_range = []
t_domain.forEach(function(d){
  t_range.push(colorScale(d))
})


var threshScale = d3.scaleThreshold()
        .domain(t_domain)
        .range(t_range)


// D3 Projection
var projection = d3.geoAlbersUsa()
                   .translate([width/2, height/2])    // translate to center of screen
        
// Define path generator
var path = d3.geoPath()             
             .projection(projection);  


var body = d3.select('body div.container')

// create the SVG
var svg = body.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("Stroke", "#000")
    .attr("fill", "none")

// Add Tooltip
var tip = body.append('div')
    .attr('class', 'tooltip')
    .style("opacity", 0);

// Add Legend
let legend = svg.append("g")
          .attr("class", "legend")
          .attr("transform", "translate(900,200)")

    legend.selectAll("rect")
      .data(threshScale.range())
      .enter().append("rect")
          .attr("width", 7)
          .attr("height", 35)
          .attr("y", function(d, i ) { return i*35; })
          .attr("fill", function(d) { return d; })

    legend.selectAll("text")
      .data(threshScale.domain())
      .enter().append("text")
          .text(function(d, i) { 
            let per = d < 0 ? Math.abs(d): d;
            return `${per} %`;
          })
          .attr("y", function(d, i ) { return i*35 + 25; })
          .attr("x", 10)
          .attr("fill", black)

// Draw timeline
d3.csv("data/yearwise-winner.csv") 
    .row(function(d) {  
        return {
           year : +d.YEAR
           , party : d.PARTY
        };
    })
    .get(function(error, rows) { 

        // let line = svg.append("g")
        //     .attr("transform", "translate(0, 15)")

      let timeline = svg.append("g")
          .attr("class", "timeline")
          .attr("transform", "translate(50, 15)")


      // line.append("line")
      //     .attr('x1', 0)
      //     .attr('x2', 950)
      //     .attr('y1', 0)
      //     .attr('y2', 0)
      //     .attr('stroke-width', .5)
      //     .attr('stroke', black)

      timeline.selectAll("circle")
          .data(rows)
          .enter().append("circle")
              .attr('cx', function (d, i) {
                  return 45 * i 
              })
              .attr('fill', function (d) {
                  return d.party === 'D' ? demColor : repColor; 
              })
              .attr("r", 15)
              .attr("value", function(d) {return d.year})
              .text(function(d){return d.year})
              .on('click', function(d){
                  getMap(d.year, true);
                  let curr_year = d3.select("#current-year")
                  curr_year
                    .style('color', function () {
                        return d.party === 'D' ? demColor : repColor; 
                    })
                    .html(d.year)
                  
              })

      timeline.selectAll('text')
          .data(rows)
            .enter().append("text")
                .attr('x', function (d, i) {
                    return 45 * i - 11 
                })
                .attr('y', 3)
                .attr('class', 'timeline')
                .attr('fill', white)
                .text(function(d) {return d.year})
});

// Draw Map
getMap(2016);



function parseStr(str){
    return str.replace(/[^0-9 | ^.]/g, '');
}

function buildToolTipStr(state){
    let prop = state.properties;
    let r = prop.results;

    let str = 
    `<h5> ${prop.name} </h5> 
    electoral votes: ${r.Total_EV}

    <li class="dem"> ${r.D_Nominee} : ${r.D_Votes} (${r.D_Percentage}%) </li>
    <li class="rep"> ${r.R_Nominee} : ${r.R_Votes} (${r.R_Percentage}%) </li>
    `

    return str
}


function getMap(year){

    d3.csv(`data/election-results-${year}.csv`)
        .row(function(d) {
            let states = {};

            states[d.Abbreviation] = {
                "name" : d.State
                , "Total_EV" : parseInt(parseStr(d.Total_EV))
                , "D_Nominee" : d.D_Nominee 
                , "D_Percentage" : parseFloat(parseStr(d.D_Percentage))
                , "D_Votes" : parseInt(parseStr(d.D_Votes))
                , "R_Nominee" : d.R_Nominee 
                , "R_Percentage" : parseFloat(parseStr(d.R_Percentage))
                , "R_Votes" : parseInt(parseStr(d.R_Votes))
                , "Year" : new Date(+d.Year, 0,1)
            };
            
            return states;
        })
        .get(function(error, rows) { generateMap(rows) });
}


function generateMap(rows, update){

    svg.selectAll('path').remove()
    svg.selectAll('.abbr').remove()

    d3.json("us-states.json", function(error, us) {
      if (error) throw error;

      let states = us.features
      let state_to_results = {}


      // join States into one dictionary from list of dicts
      rows.forEach(function(row){
        let key = Object.keys(row)[0];
        let value = Object.values(row)[0];
        state_to_results[key] = value;
      });

      // update the states json with the results from the election
      states.forEach(function(s){
        results = state_to_results[s.properties.abbr];
        s.properties.results = results;
      });

      let paths = svg.append('g')
      let abbrs = svg.append('g')

      // add States and Update the ToolTip
      paths.selectAll("path")
          .data(states)
          .enter().append("path")
              .attr("d", path)
              .style("stroke", function(d){
                return (d.properties.results) ? black : 'none';
              })
              .style("stroke-width", ".25")
              .style("fill", function(d){
                let r = d.properties.results;
                if (r){
                    return threshScale(r.D_Percentage - r.R_Percentage)
                }

              })
              .on('mouseover', function(d){
                let bounds = path.bounds(d);

                tip.transition()
                 .duration(100)
                 .style("opacity", .9);
                tip.html(buildToolTipStr(d))
                    .style("left", ((bounds[0][0] + bounds[1][0]) / 2) + `px`)
                    .style("top", (bounds[0][1]) + `px`);

              })
              .on('mouseout', function(){
                tip.transition()
                 .duration(500)
                 .style('opacity', 0)
              });
  
      // Add State Abbr over each State
      abbrs.selectAll("text")
          .data(states)
          .enter().append("text")
              .attr("class", "abbr")
              .text(function(d){
                let prop = d.properties
                let r = prop.results
                if (r){
                  return `${prop.abbr} (${r.Total_EV})`;
                }
              })
              .attr("fill", function(d){
                let r = d.properties.results
                if (r){
                  let adjustments = new Set(['HI', 'MD', 'MA', 'VT', 'DE'])
                  if (adjustments.has(d.properties.abbr)) {
                    return black;
                  }
                  return (Math.abs(r.D_Percentage - r.R_Percentage) > 25? white : black);
                }
              })
              .attr("transform", function(d) { 
                let loc = path.centroid(d)
                let adjustments = new Set(['FL', 'MI', 'DE', 'RI', 'NH', 'LA'])
                if (adjustments.has(d.properties.abbr)) {
                  loc[0] += 10;
                  loc[1] += 10;
                }
                return `translate(${loc})`; 
              })

    });
}