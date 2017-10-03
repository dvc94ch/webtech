/* Initialization */
$(document).ready(function(event) {
    onHashChange();

    var theme = Cookies.get('theme');
    if (typeof theme === 'undefined') {
        setTheme('dark');
    } else {
        setTheme(theme);
    }
});

/* Navigation */
window.addEventListener("hashchange", onHashChange, false);

function setHash(hash) {
    location.hash = hash;
    onHashChange();
}

function onHashChange() {
    $('.page').addClass('collapse');

    switch (location.hash) {
    case '':
        $('#home').removeClass('collapse');
        break;
    case '#canvas':
        $('#canvas').removeClass('collapse');
        loadCanvas();
        break;
    case '#form':
        $('#form').removeClass('collapse');
        loadPollData();
        break;
    }
}

/* Themes */
$('#dark-theme').click(function() {
    setTheme('dark');
});

$('#primary-theme').click(function() {
    setTheme('primary');
});

function setTheme(theme) {
    Cookies.set('theme', theme, { expires: 365 });

    if (theme === 'dark') {
        setDarkTheme();
    } else {
        setPrimaryTheme();
    }
}

function setPrimaryTheme() {
    $('#primary-theme').addClass('active');
    $('#dark-theme').removeClass('active');

    $('.bg-dark').addClass('bg-primary').removeClass('bg-dark');
    $('.btn-dark').addClass('btn-primary').removeClass('btn-dark');
    $('.alert-dark').addClass('alert-primary').removeClass('alert-dark');
}

function setDarkTheme() {
    $('#dark-theme').addClass('active');
    $('#primary-theme').removeClass('active');

    $('.bg-primary').addClass('bg-dark').removeClass('bg-primary');
    $('.btn-primary').addClass('btn-dark').removeClass('btn-primary');
    $('.alert-primary').addClass('alert-dark').removeClass('alert-primary');
}

/* Canvas */
function rgb(color) {
    return "rgb(" + color[0].toString() + "," +
        color[1].toString() + "," + color[2].toString() + ")";
}

function scaleColor(color, p) {
    return _.map(color, function(value) {
        var newValue = value * p;
        if (newValue > 255) {
            newValue = 255;
        }
        if (newValue < 0) {
            newValue = 0;
        }
        return Math.round(newValue);
    });
}

function getBaseColor(theme) {
    switch (theme) {
    case 'dark':
        return [52, 58, 64];
    case 'primary':
        return [0, 123, 255];
    default:
        return [0, 0, 0];
    }
}

function getColorGenerator() {
    var i = 0;
    var baseColor = getBaseColor(Cookies.get('theme'));
    return function() {
        return rgb(scaleColor(baseColor, 1 + 0.3 * i++));
    };
}

function loadCanvas() {
    $.ajax({
        dataType: "json",
        url: "/poll-stats",
        data: {},
        success: renderPieChart
    });
}

function renderPieChart(data) {
    var canvas = document.getElementById('pie-chart');

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(0.5, 0.5);

    var padding = 50;
    var radiusPie = 150;
    var posPie = [radiusPie + padding, radiusPie + padding];
    var posLegend = [canvas.width - padding - 50, padding];

    var sum = _.reduce(data, function(sum, value) {
        return sum + value;
    }, 0);

    var angles = _.map(data, function(value, key) {
        return value / sum * 2 * Math.PI;
    });

    var labels = _.map(data, function(value, key) {
        return key;
    });

    renderPie(ctx, angles, getColorGenerator(), posPie, radiusPie);
    renderLegend(ctx, labels, getColorGenerator(), posLegend);
}

function renderPie(ctx, angles, colorGenerator, center, radius) {
    var posAngle = 0;
    var i = 0;
    _.each(angles, function(angle) {
        var nextPosAngle = posAngle + angle;
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(center[0], center[1]);
        ctx.arc(center[0], center[1], radius, posAngle, nextPosAngle);
        ctx.stroke();
        ctx.fillStyle = colorGenerator();
        ctx.fill();
        ctx.closePath();
        posAngle = nextPosAngle;
        i += 1;
    });
}

function renderLegend(ctx, labels, colorGenerator, pos) {
    var posY = pos[1];
    _.each(labels, function(label) {
        ctx.fillStyle = colorGenerator();
        ctx.fillRect(pos[0] - 15, posY - 5, 10, 10);

        ctx.fillStyle = '#000';
        ctx.fillText(label, pos[0], posY);

        posY += 25;
    });
}

/* Form */
$('.poll').click(function() {
    submitPollData($(this).attr('id'));
});

function selectButton(id) {
    console.log(id);
    $('.poll').removeClass('active');
    $('#' + id).addClass('active');
}

function loadPollData() {
    var pollId = Cookies.get('poll');

    if (typeof pollId !== 'undefined') {
        $.ajax({
            type: "GET",
            dataType: "json",
            url: "/poll/" + pollId,
            success: selectButton
        });
    }
}

function submitPollData(pollData) {
    var pollId = Cookies.get('poll');

    if (typeof pollId === 'undefined') {
        $.ajax({
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            url: "/poll",
            data: JSON.stringify(pollData),
            success: function(data) {
                Cookies.set('poll', data.id, { expires: 365 });
                selectButton(pollData);
                setHash('#canvas');
            }
        });
    } else {
        $.ajax({
            type: "PUT",
            dataType: "json",
            contentType: "application/json",
            url: "/poll/" + pollId,
            data: JSON.stringify(pollData),
            success: function(data) {
                if (data.status === "err") {
                    Cookies.remove('poll');
                    submitPollData(pollData);
                } else {
                    selectButton(pollData);
                    setHash('#canvas');
                }
            }
        });
    }
}
