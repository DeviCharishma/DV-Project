(function drawBubbleChart() {
  const svg = d3.select("#bubble-chart")
                .append("svg")
                .attr("width", 960)
                .attr("height", 600);

  const width = +svg.attr("width"),
        height = +svg.attr("height");

  const margin = { top: 50, right: 200, bottom: 60, left: 80 },
        innerWidth = width - margin.left - margin.right,
        innerHeight = height - margin.top - margin.bottom;

  const chart = svg.append("g")
                   .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("body")
                    .append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

  d3.csv("https://gist.githubusercontent.com/bhavya3377/7072aedab4c27686b1c74f9441d24c3a/raw/8f22358cf97178c4b9fafadb0a9c13acd96cfb90/Electric_vehicle_charging_station_merge.csv")
    .then(data => {
      data = data.filter(d => d['Electric Range'] && d['Model Year'] && d['Station_Count']);
      data = data.slice(0, 400); // Limit data points

      data.forEach(d => {
        d.ModelYear = +d['Model Year'];
        d.Range = +d['Electric Range'];
        d.Stations = Math.min(+d['Station_Count'], 50); // Cap outliers
        d.Type = d['E.V_Type'];
        d.Make = d.Make || "";
        d.Model = d.Model || "";

        d.jitterX = d.ModelYear + (Math.random() - 0.5) * 0.5;
        d.jitterY = d.Range + (Math.random() - 0.5) * 10;
      });

      const x = d3.scaleLinear()
                  .domain(d3.extent(data, d => d.jitterX)).nice()
                  .range([0, innerWidth]);

      const y = d3.scaleLinear()
                  .domain([0, d3.max(data, d => d.jitterY)]).nice()
                  .range([innerHeight, 0]);

      const r = d3.scaleSqrt()
                  .domain([0, d3.max(data, d => d.Stations)])
                  .range([4, 18]);

      const color = d3.scaleOrdinal(d3.schemeTableau10);

      chart.append("g")
           .attr("transform", `translate(0,${innerHeight})`)
           .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      chart.append("g")
           .call(d3.axisLeft(y));

      chart.append("g")
           .attr("class", "grid")
           .attr("transform", `translate(0,${innerHeight})`)
           .call(d3.axisBottom(x).ticks(5).tickSize(-innerHeight).tickFormat(""));

      chart.append("g")
           .attr("class", "grid")
           .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

      data.sort((a, b) => b.Stations - a.Stations);

      chart.selectAll("circle")
           .data(data)
           .enter()
           .append("circle")
           .attr("cx", d => x(d.jitterX))
           .attr("cy", d => y(d.jitterY))
           .attr("r", d => r(d.Stations))
           .attr("fill", d => color(d.Type))
           .attr("opacity", 0.7)
           .on("mouseover", function (event, d) {
              tooltip.transition().duration(200).style("opacity", 1);
              tooltip.html(`
                <strong>${d.Make} ${d.Model}</strong><br/>
                Type: ${d.Type}<br/>
                Year: ${d.ModelYear}<br/>
                Range: ${d.Range} mi<br/>
                Stations Nearby: ${d.Stations}
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
           })
           .on("mouseout", function () {
              tooltip.transition().duration(500).style("opacity", 0);
           });

      svg.append("text")
         .attr("x", width / 2)
         .attr("y", height - 10)
         .attr("text-anchor", "middle")
         .style("font-size", "14px")
         .text("Model Year");

      svg.append("text")
         .attr("transform", "rotate(-90)")
         .attr("x", -height / 2)
         .attr("y", 20)
         .attr("text-anchor", "middle")
         .style("font-size", "14px")
         .text("Electric Range (mi)");

      const types = [...new Set(data.map(d => d.Type))];
      const legend = svg.append("g")
                        .attr("transform", `translate(${width - 140}, 60)`);

      types.forEach((type, i) => {
        legend.append("circle")
              .attr("cx", 0)
              .attr("cy", i * 25)
              .attr("r", 6)
              .attr("fill", color(type));

        legend.append("text")
              .attr("x", 12)
              .attr("y", i * 25 + 5)
              .text(type)
              .style("font-size", "13px")
              .attr("alignment-baseline", "middle");
      });
  });
})();


(function drawStreamgraph() {
  const margin = { top: 20, right: 30, bottom: 30, left: 40 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  // SVG setup
  const svg = d3
    .select("#streamgraph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Tooltip setup
  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // Load CSV data
  d3.csv(
    "https://gist.githubusercontent.com/bhavya3377/7072aedab4c27686b1c74f9441d24c3a/raw/8f22358cf97178c4b9fafadb0a9c13acd96cfb90/Electric_vehicle_charging_station_merge.csv"
  )
    .then((data) => {
      // Filter valid years
      const filtered = data.filter(
        (d) => d["Model Year"] && !isNaN(+d["Model Year"])
      );
      const years = Array.from(
        new Set(filtered.map((d) => +d["Model Year"]))
      ).sort();
      const types = Array.from(new Set(filtered.map((d) => d["E.V_Type"])));

      // Aggregate counts
      const nested = d3.rollup(
        filtered,
        (v) => v.length,
        (d) => +d["Model Year"],
        (d) => d["E.V_Type"]
      );

      // Convert to wide format
      const dataset = years.map((year) => {
        const row = { Year: new Date(year, 0, 1) };
        types.forEach((type) => {
          row[type] = nested.get(year)?.get(type) || 0;
        });
        return row;
      });

      const keys = types;

      // Stack layout
      const stack = d3.stack().keys(keys).offset(d3.stackOffsetSilhouette);

      const series = stack(dataset);

      // Scales
      const x = d3
        .scaleTime()
        .domain(d3.extent(dataset, (d) => d.Year))
        .range([0, width]);

      const y = d3
        .scaleLinear()
        .domain([
          d3.min(series, (s) => d3.min(s, (d) => d[0])),
          d3.max(series, (s) => d3.max(s, (d) => d[1])),
        ])
        .range([height, 0]);

      const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

      // Area generator
      const area = d3
        .area()
        .x((d) => x(d.data.Year))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveBasis);

      // Draw areas with fade-in animation
      svg
        .selectAll(".stream-path")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream-path")
        .attr("fill", (d) => color(d.key))
        .attr("d", area)
        .attr("opacity", 0) // ← Start transparent
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100) // ← Stagger each stream
        .attr("opacity", 1); // ← Fade in

      // Hover tooltip interactions
      svg
        .selectAll(".stream-path")
        .on("mouseover", function (event, d) {
          d3.selectAll(".stream-path").style("opacity", 0.3);
          d3.select(this).style("opacity", 1);

          const hoveredDate = x.invert(event.offsetX - margin.left);
          const hoveredYear = d3.timeFormat("%Y")(hoveredDate);
          const nearest = d.find(
            (p) => d3.timeFormat("%Y")(p.data.Year) === hoveredYear
          );
          const count = nearest ? Math.round(nearest[1] - nearest[0]) : "N/A";

          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`
          <div class="tooltip-title">${d.key}</div>
          <div class="tooltip-line"><strong>Model Year:</strong> ${hoveredYear}</div>
          <div class="tooltip-line"><strong>Vehicle Count:</strong> ${count}</div>
        `);
          tooltip
            .style("left", `${event.pageX + 15}px`)
            .style("top", `${event.pageY - 40}px`);
        })
        .on("mouseout", function () {
          d3.selectAll(".stream-path").style("opacity", 1);
          tooltip.transition().duration(500).style("opacity", 0);
        });

      // X-axis
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));
    })
    .catch((error) => console.error("Data load error:", error));
})();

// Radial Chart of EV Models
(function drawRadialChart() {
  const width = 600,
    height = 600,
    innerRadius = 100,
    outerRadius = Math.min(width, height) / 2 - 50;

  const svg = d3
    .select("#radial")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  const dataUrl =
    "https://gist.githubusercontent.com/bhavya3377/7072aedab4c27686b1c74f9441d24c3a/raw/8f22358cf97178c4b9fafadb0a9c13acd96cfb90/Electric_vehicle_charging_station_merge.csv";

  d3.csv(dataUrl)
    .then((data) => {
      const labelCounts = d3.rollups(
        data.filter((d) => d.Model && d.Make && d.Model.length < 20),
        (v) => v.length,
        (d) => `${d.Make} - ${d.Model}`
      );

      const topModels = labelCounts
        .sort((a, b) => d3.descending(a[1], b[1]))
        .slice(0, 12);

      const angle = d3
        .scaleBand()
        .domain(topModels.map((d) => d[0]))
        .range([0, 2 * Math.PI]);

      const radius = d3
        .scaleLinear()
        .domain([0, d3.max(topModels, (d) => d[1])])
        .range([innerRadius, outerRadius]);

      const arcGen = d3
        .arc()
        .innerRadius(innerRadius)
        .startAngle((d) => angle(d[0]))
        .endAngle((d) => angle(d[0]) + angle.bandwidth())
        .padAngle(0.01)
        .padRadius(innerRadius);

      const arcs = svg
        .selectAll(".arc")
        .data(topModels)
        .enter()
        .append("path")
        .attr("class", "arc")
        .attr("fill", "#2196f3")
        .attr("d", (d) => arcGen.outerRadius(innerRadius)(d))
        .on("mouseover", (event, d) => {
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>Model:</strong> ${d[0]}<br><strong>Count:</strong> ${d[1]}`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition()
        .duration(1000)
        .attrTween("d", (d) => {
          const i = d3.interpolate(innerRadius, radius(d[1]));
          return (t) => arcGen.outerRadius(i(t))(d);
        });

      svg
        .selectAll("text")
        .data(topModels)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", (d) => {
          const a = angle(d[0]) + angle.bandwidth() / 2 - Math.PI / 2;
          const r = radius(d[1]) + 20;
          return `translate(${Math.cos(a) * r},${Math.sin(a) * r})rotate(${
            (a * 180) / Math.PI
          })`;
        })
        .text((d) => d[0])
        .style("font-size", "11px");
    })
    .catch((err) => console.error("Radial chart load error:", err));
})();

// Bar Chart of EVs vs Charging Stations
(function drawBarChart() {
  const margin = { top: 50, right: 30, bottom: 70, left: 100 },
    width = 900 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  const svg = d3
    .select("#barchart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  d3.csv(
    "https://gist.githubusercontent.com/bhavya3377/7072aedab4c27686b1c74f9441d24c3a/raw/8f22358cf97178c4b9fafadb0a9c13acd96cfb90/Electric_vehicle_charging_station_merge.csv"
  )
    .then((data) => {
      const grouped = d3.rollups(
        data.filter((d) => d.ZIP),
        (v) => ({
          evs: v.length,
          stations: d3.mean(v, (d) => +d.Station_Count || 0),
        }),
        (d) => d.ZIP
      );

      const topZips = grouped
        .filter((d) => d[0] && d[1].evs > 0 && d[1].stations > 0)
        .map((d) => ({
          zip: d[0],
          diff: d[1].stations - d[1].evs,
          evs: d[1].evs,
          stations: d[1].stations,
        }))
        .sort((a, b) => d3.ascending(a.diff, b.diff))
        .slice(0, 15);

      const x = d3
        .scaleLinear()
        .domain(d3.extent(topZips, (d) => d.diff))
        .nice()
        .range([0, width]);

      const y = d3
        .scaleBand()
        .domain(topZips.map((d) => d.zip))
        .range([0, height])
        .padding(0.3);

      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      svg.append("g").call(d3.axisLeft(y));

      svg
        .selectAll(".bar")
        .data(topZips)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(Math.min(0, d.diff)))
        .attr("y", (d) => y(d.zip))
        .attr("width", (d) => Math.abs(x(d.diff) - x(0)))
        .attr("height", y.bandwidth())
        .attr("fill", (d) => (d.diff >= 0 ? "#43a047" : "#e53935"))
        .on("mouseover", (event, d) => {
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>ZIP:</strong> ${
                d.zip
              }<br><strong>EVs:</strong> ${Math.round(
                d.evs
              )}<br><strong>Stations:</strong> ${Math.round(
                d.stations
              )}<br><strong>Diff:</strong> ${Math.round(d.diff)}`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

      svg
        .append("line")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#000")
        .attr("stroke-dasharray", "3,3");

      // Add chart title
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("EVs vs Charging Stations by ZIP Code");

      // Add X axis label
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .text("Difference (Stations - EVs)");
    })
    .catch((err) => console.error("Data load error:", err));
})();

