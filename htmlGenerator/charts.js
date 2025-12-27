const { escapeHtml, formatChartDate } = require('./helpers');

/**
 * Generate chart for a single location with a metric
 */
function generateLocationChart(location, metricName, metricType) {
    if (!location.timeSeries || !Array.isArray(location.timeSeries) || location.timeSeries.length === 0) {
        return '<p class="no-data">No time series data available.</p>';
    }

    // Process time series data
    const dataByDate = {};
    location.timeSeries.forEach(dataPoint => {
        const dateKey = `${dataPoint.date.year}-${String(dataPoint.date.month).padStart(2, '0')}-${String(dataPoint.date.day).padStart(2, '0')}`;
        const value = parseInt(dataPoint.value, 10) || 0;
        dataByDate[dateKey] = value;
    });

    // Sort by date
    const sortedDates = Object.keys(dataByDate).sort();
    const labels = sortedDates.map(date => formatChartDate(date));
    const values = sortedDates.map(date => dataByDate[date]);

    const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
        <div class="chart-container">
            <h4 class="chart-title">${escapeHtml(metricName)}</h4>
            <canvas id="${chartId}"></canvas>
        </div>
        <script>
            (function() {
                const ctx = document.getElementById('${chartId}');
                if (ctx) {
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ${JSON.stringify(labels)},
                            datasets: [{
                                label: '${escapeHtml(metricName)}',
                                data: ${JSON.stringify(values)},
                                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                                borderColor: 'rgba(37, 99, 235, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        precision: 0
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                }
            })();
        </script>
    `;
}

module.exports = {
    generateLocationChart,
};
