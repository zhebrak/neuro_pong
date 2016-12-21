function rand() {
    return Math.random() * 2 - 1;
}

function sigmoid(t) {
    return 1 / (1 + Math.pow(Math.E, -t));
}

function Evolution(options) {
    defaults = {
        network: [2, 1],
        inputSize: 2,

        population: 2500,
        childCount: 1,
        mutationRate: 0.1,
        mutationRange: 0.3,

        elitism: 0.2,
        luck: 0.1,
        chaos: 0.2,
    }

    this.options = defaults;
    for (var i in options) {
        this.options[i] = options[i];
    }

    this.generationsCount = 0;

    this.newGeneration = function() {
        if (!this.generationsCount) {
            this.generation = new Generation(this.options);
        } else {
            this.generation = this.generation.nextGeneration();
        }
        this.generationsCount++;
        return this.generation;
    };

    this.generation = this.newGeneration();
}

var Neuron = function(weightsCount) {
    this.output = 0;
    this.weights = [];

    for (var i = 0; i < weightsCount; i++) {
        this.weights.push(rand());
    }
};

var Layer = function(inputSize, neuronsCount) {
    this.neurons = [];
    for (var i = 0; i < neuronsCount; i++) {
        var neuron = new Neuron(inputSize);
        this.neurons.push(neuron);
    }

    this.getOutput = function() {
        var output = [];
        for (var i = 0; i < this.neurons.length; i++) {
            output.push(this.neurons[i].output);
        }
        return output;
    }
}

function Network(inputSize, layers) {
    this.layers = [];

    var inputLayer = new Layer(inputSize, layers[0]);
    this.layers.push(inputLayer);
    var previousLayer = inputLayer;

    for (var i = 1; i < layers.length; i++) {
        var layer = new Layer(previousLayer.neurons.length, layers[i]);
        this.layers.push(layer);
        previousLayer = layer;
    }

    this.forwardPropagation = function(input) {
        for (var l = 0; l < this.layers.length; l++) {
            var input = input;
            for (var n = 0; n < this.layers[l].neurons.length; n++) {
                var output = 0;

                for (i = 0; i < input.length; i++) {
                    output += input[i] * this.layers[l].neurons[n].weights[i];
                }
                this.layers[l].neurons[n].output = sigmoid(output);
            }
            input = this.layers[l].getOutput();
        }
        return this.layers[this.layers.length - 1].getOutput();
    }

    this.dump = function() {
        var weights = [];

        for (var l = 0; l < this.layers.length; l++) {
            for (var n = 0; n < this.layers[l].neurons.length; n++) {
                for (var w = 0; w < this.layers[l].neurons[n].weights.length; w++) {
                    weights.push(this.layers[l].neurons[n].weights[w]);
                }
            }
        }
        return weights;
    }

    this.load = function(weights) {
        var index = 0;
        for (var l = 0; l < this.layers.length; l++) {
            for (var n = 0; n < this.layers[l].neurons.length; n++) {
                for (var w = 0; w < this.layers[l].neurons[n].weights.length; w++) {
                    this.layers[l].neurons[n].weights[w] = weights[index];
                    index++;
                }
            }
        }
        return this;
    }
}

function Generation(options) {
    function Genome(network) {
        this.score = 0;
        this.newNetwork = function() {
            return new Network(options.inputSize, options.network);
        }
        this.network = network || this.newNetwork();

        this.breed = function(pair) {
            var offspring = [];
            for (var i = 0; i < options.childCount; i++) {
                thisWeights = this.network.dump();
                pairWeights = pair.network.dump();

                var newWeights = [];
                for (var i = 0; i < thisWeights.length; i++) {
                    if (Math.random() < 0.5) {
                        newWeights.push(thisWeights[i]);
                    } else {
                        newWeights.push(pairWeights[i]);
                    }

                    if (Math.random() < options.mutationRate) {
                        newWeights[i] += rand() * options.mutationRange;
                    }
                }

                var network = this.newNetwork();
                var genome = new Genome(network.load(newWeights));
                offspring.push(genome);
            }
            return offspring;
        }

        this.action = function(input) {
            return this.network.forwardPropagation(input);
        }
    }

    this.genomes = [];
    for (var i = 0; i < options.population; i++) {
        this.genomes.push(new Genome());
    }

    this.nextGeneration = function() {
        this.genomes.sort(function(a, b) {return b.score - a.score});
        var newGeneration = [];

        var eliteCount = Math.round(options.population * options.elitism);
        for (var i = 0; i < eliteCount; i++) {
            newGeneration.push(this.genomes[i]);
        }

        var luckCount = Math.round(options.population * options.luck);
        for (var i = 0; i < luckCount; i++) {
            var luckyIndex = Math.floor(Math.random() * (this.genomes.length - eliteCount)) + eliteCount;
            newGeneration.push(this.genomes[luckyIndex]);
        }

        var randomCount = Math.round(options.population * options.chaos);
        for (var i = 0; i < randomCount; i++) {
            newGeneration.push(new Genome());
        }

        var breedIndex = 0;
        while (newGeneration.length < options.population) {
            var pairIndex = Math.floor(Math.random() * this.genomes.length);
            var offspring = this.genomes[breedIndex].breed(this.genomes[pairIndex]);
            for (var i = 0; i < offspring.length; i++) {
                newGeneration.push(offspring[i]);
            }
            breedIndex++;
        }

        this.genomes = newGeneration;
        return this;
    }

    this.updateScores = function(scores) {
        for (var i = 0; i < scores.length; i++) {
            this.genomes[i].score = scores[i];
        }
    }
}
