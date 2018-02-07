import * as d3 from "d3";
import DomainsAdapter from "./DomainsAdapter";
import FeaturesAdapter from "./FeaturesAdapter";
import QualityAdapter from "./QualityAdapter";
import QualitySummaryAdapter from "./QualitySummaryAdapter";
import BindingSitesAdapter from "./BindingSitesAdapter";
import DataService from "./DataService"

import Utils from "./Utils";


class PDBeSequenceViewer extends HTMLElement {

  constructor() {
    super();
    this._components = [];
    this._pdbid = this.getAttribute("pdbid");
    this._entityId = this.getAttribute("entityId");
    this._componentDataHash = {};
    this._utils = new Utils();

  }


  connectedCallback() {

    console.log('Loaded PDB sequence viewer');
    //console.log("Required components => " + this._components);
    console.log("PDBID => " + this._pdbid);

    //reading configuration
    d3.json("pdbe-sequence-viewer/config/config.json", config => {

      console.log("Config => ", config);
      var dataService = new DataService();
      var compObj = this;

      // getting list of components to paint from configuration
      config["default_structure"].forEach(struct => {
        struct["contents"].forEach(content => {
          this._components.push(content["id"])
        })
      });

      console.log(this._components)
      // api to get outlier ratio to get best chain id
      var ratioPromiseList = dataService.createPromise([this._pdbid], ['observedResidueRatio']);

      ratioPromiseList.forEach(ratioPromise => {

        ratioPromise.then(function (ratioResult) {

          var bestEntry = ratioResult[compObj._pdbid][compObj._entityId][0];
          compObj._bestChainId = bestEntry.chain_id;
          compObj._bestStructAsymId = bestEntry.struct_asym_id;
          compObj._pdbSequenceLength = bestEntry.number_residues;
          compObj._displaystart = 1;
          compObj._displayend = compObj._pdbSequenceLength;

          compObj.paintBasicLayout(compObj);

          //console.log(config['component'])

          // creating list of promises required for requested components
          var promiseList = [];
          var apiList = [];
          var componentHash = {};

          compObj._components.forEach(component => {
            let tempList = config['service'][component];
            apiList.push(tempList);
            componentHash[component] = '';
          });

          // also push apiList for molecule component which should be default
          apiList.push(config['service']['molecule'])

          // flattening promise list
          apiList = compObj._utils.flattenArray(apiList);

          // making a unique list
          apiList = compObj._utils.uniqueArray(apiList);

          console.log(apiList);

          promiseList = dataService.createPromise([compObj._pdbid], apiList, compObj._bestChainId, compObj._bestStructAsymId);

          dataService.combineData(promiseList, compObj._pdbid, apiList).then(function (combinedResult) {

            console.log(combinedResult)

            // paint molecule component by default

            let moleculeData = [
              {
                accession: "molecule", locations: [{
                  fragments: []
                }], color: config["color_code"]["molecule"]
              },
              {
                accession: "mutated", locations: [{
                  fragments: []
                }], color: config["color_code"]["mutated"]
              },
              {
                accession: "modified", locations: [{
                  fragments: []
                }], color: config["color_code"]["modified"]
              }
            ];

            // molecule component
            if (combinedResult[compObj._pdbid]['entities']['resolve']) {

              combinedResult[compObj._pdbid]['entities']['result'][compObj._pdbid]
                .filter(x => (x.entity_id && x.entity_id == compObj._entityId))
                .forEach(element => {
                  
                  compObj._pdbSequence = element.sequence;
                  document.querySelector('#top-sequence').data = compObj._pdbSequence;

                  let fragment = {
                    start: compObj._displaystart,
                    end: compObj._displayend,
                    toolTip: "Residue {resNum} ({charAtResNum})<br>" +
                      "<b>" + compObj._pdbid + "</b>"
                  };

                  moleculeData[0].locations[0].fragments.push(fragment);

                });
            }

            // populating mutated residues
            if (combinedResult[compObj._pdbid]["mutatedResidues"]["resolve"]) {

              combinedResult[compObj._pdbid]["mutatedResidues"]["result"][compObj._pdbid]
                .filter(x => (x.entity_id && x.entity_id == compObj._entityId))
                .forEach(mutatedElement => {

                  let tempFragment = {
                    start: mutatedElement.residue_number,
                    end: mutatedElement.residue_number,
                    toolTip: mutatedElement.mutation_details.from + " --> " + mutatedElement.mutation_details.to +
                      " (" + mutatedElement.mutation_details.type + ")"
                  }
                  moleculeData[1].locations[0].fragments.push(tempFragment);

                });
            }

            // populating modified residues
            if (combinedResult[compObj._pdbid]["modifiedResidues"]["resolve"]) {

              combinedResult[compObj._pdbid]["modifiedResidues"]["result"][compObj._pdbid]
                .filter(x => (x.entity_id && x.entity_id == compObj._entityId))
                .forEach(modifiedElement => {

                  let tempFragment = {
                    start: modifiedElement.residue_number,
                    end: modifiedElement.residue_number,
                    toolTip: "Modified Residue: " + modifiedElement.chem_comp_id
                  }
                  moleculeData[2].locations[0].fragments.push(tempFragment);

                });
            }

            compObj._componentDataHash["molecule"] = moleculeData;

            document.querySelector('#molecule-track').data = moleculeData;

            // painting components as per default configuration
            config["default_structure"].forEach(category => {
              

              let categoryDiv = compObj.mainContent.append('div')
                .attr('id', category.id + "-div")
                .attr('class', 'category-div');

              categoryDiv.append('div')
                .attr('class', 'left category')
                .text(category.label)
                .on('click', function () {
                  compObj._utils.toggle($(this));
                });
              
              let categorySummaryComponent = document.createElement('protvista-pdbe-track');
              categorySummaryComponent.setAttribute('id', category.id + "-summary-track");
              categorySummaryComponent.setAttribute('class', 'right');
              categorySummaryComponent.setAttribute('length', compObj._pdbSequenceLength);
              categorySummaryComponent.setAttribute('displaystart', compObj._displaystart);
              categorySummaryComponent.setAttribute('displayend', compObj._displayend);

              categoryDiv.node().append(categorySummaryComponent);
              
              // paint sub components as applicable
              if (category.type === "multi") {

                let categoryTracksDiv = categoryDiv.append('div')
                  .attr('id', category.id + "-tracks")
                  .attr('style', 'position:absolute;left:-999em')
                  //.attr('style', 'display:none');
                  //.attr('visibility', 'hidden')

                category.contents.forEach(subcomponent => {

                  if (subcomponent.adapter != undefined) {

                    let respectiveClass = compObj._utils.createClassByName(subcomponent.adapter, subcomponent, compObj, config,
                      combinedResult[compObj._pdbid][subcomponent.resultMap]["result"][compObj._pdbid]);

                    let data = respectiveClass.getData();
                    
                    // paint component if data is present
                    if (data[0] != undefined && data[0].present) {

                      // keep the data in hash for other components to use instead of making a new call
                      compObj._componentDataHash[subcomponent.id] = data;
                      

                      categoryTracksDiv.append('div')
                        .attr('id', subcomponent.id)
                        .attr('class', 'left category-header')
                        .text(subcomponent.label);
                      
                      let categoryTrackComponent = document.createElement('protvista-pdbe-track');
                      categoryTrackComponent.setAttribute('id', subcomponent.id + "-track");
                      categoryTrackComponent.setAttribute('class', 'right');
                      categoryTrackComponent.setAttribute('length', compObj._pdbSequenceLength);
                      categoryTrackComponent.setAttribute('displaystart', compObj._displaystart);
                      categoryTrackComponent.setAttribute('displayend', compObj._displayend);
                      categoryTrackComponent.setAttribute('layout', 'non-overlapping');

                      categoryTracksDiv.node().append(categoryTrackComponent);

                      document.querySelector("#" + subcomponent.id + "-track").data = data;


                    }
                  }
                });
              }

              // paint summary track as configured

              if (category.summary != undefined && category.summary.length != 0) {

                let summaryData = [];

                category.summary.forEach(element => {

                  compObj._componentDataHash[element] != undefined ? summaryData.push(compObj._componentDataHash[element][0]) : null; // data is added always to data[0]

                });

                document.querySelector("#" + category.id + "-summary-track").data = summaryData;

              } else if (category.adapter != undefined && category.adapter != "") {
                
                let respectiveClass = compObj._utils.createClassByName(category.adapter, category, compObj, config);

                let summaryData = respectiveClass.getData(); 

                document.querySelector("#" + category.id + "-summary-track").data = summaryData;

              }

            });

            // painting bottom sequence component

            compObj.bottomSeqDiv = compObj.mainContent.append('div')
              .attr('id', 'bottom-seq-div');

            compObj.bottomSeqDiv.append('div')
              .attr('class', 'left');

            let bottomSeqComponent = document.createElement('protvista-sequence');
            bottomSeqComponent.setAttribute('class', 'right');
            bottomSeqComponent.setAttribute('id', 'bottom-sequence');
            bottomSeqComponent.setAttribute('length', compObj._pdbSequenceLength);
            bottomSeqComponent.setAttribute('displaystart', compObj._displaystart);
            bottomSeqComponent.setAttribute('displayend', compObj._displayend);

            compObj.bottomSeqDiv.node().append(bottomSeqComponent);

            document.querySelector('#bottom-sequence').data = compObj._pdbSequence;

            /*d3.selectAll('protvista-pdbe-track')
              .append('data-loader')
              .attr('data-key', 'config')
                .append('source')
                .attr('src', 'https://cdn.jsdelivr.net/npm/protvista-pdbe-track/dist/config.json');*/


          },
            function (error) {
              console.log('Error loading API data');
              console.log(error);
              window.alert('Error downloading API data, please check the parameters');
            }
          );

        });


      });

      //console.log("Component Data Hash", this._componentDataHash);

      // delaying to get the components painted after API calls
      //setTimeout(this._utils.bindEvents, 4000);

    });
  }


  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {

  }

  paintBasicLayout(compObj) {

    // this.managerContent = d3.select(this)
    //   .append('protvista-manager')
    //   .attr('attributes', 'length displaystart displayend highlighstart highlightend');

    // this.mainContent = this.managerContent
    //   .append('div')
    //   .attr('class', 'main-content');

    this.mainContent = d3.select(this)
      .append('protvista-manager')
      .attr('class', 'main-content')
      .attr('attributes', 'length displaystart displayend highlighstart highlightend');

    this.navDiv = this.mainContent.append('div')
      .attr('id', 'nav-div');

    this.navDiv.append('div')
      .attr('class', 'left');

    this.navComponent = d3.select(document.createElement('protvista-navigation'));
    this.navComponent.attr('class', 'right')
      .attr('length', compObj._pdbSequenceLength)
      .attr('displaystart', compObj._displaystart)
      .attr('displayend', compObj._displayend)
      .attr('highlightstart', '')
      .attr('highlightend', '');

    this.navDiv.node().append(this.navComponent.node());


    this.topSeqDiv = this.mainContent.append('div')
      .attr('id', 'top-seq-div');

    this.topSeqDiv.append('div')
      .attr('class', 'left');

    this.topSeqElement = document.createElement('protvista-sequence');
    this.topSeqElement.setAttribute('class', 'right');
    this.topSeqElement.setAttribute('id', 'top-sequence')
    this.topSeqElement.setAttribute('length', compObj._pdbSequenceLength)
    this.topSeqElement.setAttribute('displaystart', compObj._displaystart)
    this.topSeqElement.setAttribute('displayend', compObj._displayend);

    this.topSeqDiv.node().append(this.topSeqElement);

    this.moleculeDiv = this.mainContent.append('div')
      .attr('id', 'molecule-div');

    this.moleculeDiv.append('div')
      .attr('class', 'left category')
      .text('Molecule');

    this.moleculeElement = document.createElement('protvista-pdbe-track');
    this.moleculeElement.setAttribute('id', 'molecule-track');
    this.moleculeElement.setAttribute('class', 'right');
    this.moleculeElement.setAttribute('length', compObj._pdbSequenceLength);
    this.moleculeElement.setAttribute('displaystart', compObj._displaystart);
    this.moleculeElement.setAttribute('displayend', compObj._displayend);

    this.moleculeDiv.node().append(this.moleculeElement);
      

  }

}

export default PDBeSequenceViewer;
