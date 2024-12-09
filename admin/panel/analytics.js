document.addEventListener('DOMContentLoaded', () => {
    const generatePdfButton = document.getElementById('generate-pdf');
    const reloadButton = document.getElementById('reloadButton');
    const yearSelector = document.getElementById('year-selector');
    let charts = [];

    function fetchAvailableYears() {
        fetch('http://localhost:3000/available-years')
            .then(response => response.json())
            .then(years => {
                yearSelector.innerHTML = ''; // Clear existing options
                years.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearSelector.appendChild(option);
                });

                // Set the selector to the current year or the first available year
                const currentYear = new Date().getFullYear();
                const selectedYear = years.includes(currentYear) ? currentYear : years[0];
                yearSelector.value = selectedYear;
                updateCharts(selectedYear);
            })
            .catch(error => console.error('Error fetching available years:', error));
    }

    function fetchChatMetrics(year) {
        return fetch(`http://localhost:3000/chat-metrics?year=${year}`)
            .then(response => response.json())
            .then(data => {
                const months = data.map(item => new Date(item.month).toLocaleString('default', { month: 'short' }));
                return {
                    months,
                    averageSatisfaction: data.map(item => item.averageSatisfaction),
                    escalationRate: data.map(item => item.escalationRate),
                    hallucinationRate: data.map(item => item.hallucinationRate),
                    generationEfficiency: data.map(item => item.generationEfficiency),
                    irrelevantGenerationRate: data.map(item => item.irrelevantGenerationRate),
                    averageQueryPerVisitor: data.map(item => item.averageQueryPerVisitor),
                    answerRate: data.map(item => item.answerRate),
                    generationTime: data.map(item => item.generationTime)
                };
            });
    }

    function fetchLiveSessionMetrics(year) {
        return fetch(`http://localhost:3000/livesession-metrics?year=${year}`)
            .then(response => response.json())
            .then(data => {
                const months = data.map(item => new Date(item.month).toLocaleString('default', { month: 'short' }));
                return {
                    months,
                    averageRatings: data.map(item => item.avg_rating),
                    totalSessions: data.map(item => item.total_count)
                };
            });
    }

    function fetchHelpfulMetrics(year) {
        return fetch(`http://localhost:3000/helpful-metrics?year=${year}`)
            .then(response => response.json());
    }

    function createChart(canvasId, label, labels, data, type) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: type === 'pie' 
                        ? ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)']
                        : type === 'bar' 
                        ? 'rgba(75, 192, 192, 0.2)' 
                        : undefined,
                    borderColor: type === 'pie' 
                        ? ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'] 
                        : 'blue',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                if (type === 'pie') {
                                    const total = data.reduce((acc, val) => acc + val, 0);
                                    const percentage = ((tooltipItem.raw / total) * 100).toFixed(2);
                                    return `${tooltipItem.label}: ${tooltipItem.raw} (${percentage}%)`;
                                }
                                return `${tooltipItem.label}: ${tooltipItem.raw}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: label
                    }
                }
            }
        });
    }

    function updateCharts(year) {
        Promise.all([fetchChatMetrics(year), fetchLiveSessionMetrics(year), fetchHelpfulMetrics(year)])
            .then(([chatMetrics, liveSessionMetrics, helpfulMetrics]) => {
                // Destroy existing charts before creating new ones
                charts.forEach(chart => chart.destroy());
                charts = [];

                charts.push(createChart('averageSatisfactionChart', 'Average Satisfaction', chatMetrics.months, chatMetrics.averageSatisfaction, 'line'));
                charts.push(createChart('escalationRateChart', 'Escalation Rate', chatMetrics.months, chatMetrics.escalationRate, 'line'));
                charts.push(createChart('hallucinationRateChart', 'Hallucination Rate', chatMetrics.months, chatMetrics.hallucinationRate, 'line'));
                charts.push(createChart('generationEfficiencyChart', 'Generation Efficiency', chatMetrics.months, chatMetrics.generationEfficiency, 'line'));
                charts.push(createChart('irrelevantGenerationRateChart', 'Irrelevant Generation Rate', chatMetrics.months, chatMetrics.irrelevantGenerationRate, 'line'));
                charts.push(createChart('averageQueryPerVisitorChart', 'Average Query Per Visitor', chatMetrics.months, chatMetrics.averageQueryPerVisitor, 'bar'));
                charts.push(createChart('answerRateChart', 'Answer Rate', chatMetrics.months, chatMetrics.answerRate, 'line'));
                charts.push(createChart('generationTimeChart', 'Generation Time', chatMetrics.months, chatMetrics.generationTime, 'bar'));
                charts.push(createChart('totalSessionsChart', 'Total Live Chats', liveSessionMetrics.months, liveSessionMetrics.totalSessions, 'bar'));
                charts.push(createChart('averageRatingsChart', 'Average Ratings', liveSessionMetrics.months, liveSessionMetrics.averageRatings, 'line'));
                charts.push(createChart('helpfulMetricsChart', 'Helpful vs Not Helpful', ['Helpful', 'Not Helpful'], [helpfulMetrics.totalHelpful, helpfulMetrics.totalNotHelpful], 'pie'));
            })
            .catch(error => console.error('Error fetching metrics:', error));
    }

    // Initial call to populate the year selector and charts
    fetchAvailableYears();

    yearSelector.addEventListener('change', () => {
        const selectedYear = yearSelector.value;
        updateCharts(selectedYear);
    });

    generatePdfButton.addEventListener('click', () => {
        const selectedYear = yearSelector.value;

        generatePdfButton.disabled = true;
        generatePdfButton.textContent = 'Generating PDF...';

        fetch(`http://localhost:3000/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ year: selectedYear })
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            generatePdfButton.disabled = false;
            generatePdfButton.textContent = 'Generate PDF';
        })
        .catch(error => {
            alert('Error generating PDF.');
            generatePdfButton.disabled = false;
            generatePdfButton.textContent = 'Generate PDF';
        });
    });

    reloadButton.addEventListener('click', () => {
        const selectedYear = yearSelector.value;
        updateCharts(selectedYear);
    });
});
