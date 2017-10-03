#![feature(plugin, decl_macro)]
#![plugin(rocket_codegen)]

extern crate rocket;
#[macro_use] extern crate rocket_contrib;
#[macro_use] extern crate serde_derive;

use std::io;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::sync::Mutex;

use rocket::response::NamedFile;
use rocket::State;
use rocket_contrib::Json;

type ID = usize;

#[derive(Copy, Clone, Serialize, Deserialize)]
enum PollData {
    NoWebtech,
    NotStarted,
    Started,
    Done,
    DoneWebtech,
}

type PollMap = Mutex<HashMap<ID, PollData>>;

#[derive(Default, Serialize)]
struct PollStats {
    no_webtech: usize,
    not_started: usize,
    started: usize,
    done: usize,
    done_webtech: usize,
}

impl PollStats {
    fn from(map: &PollMap) -> PollStats {
        let hashmap = map.lock().unwrap();
        let mut stats = PollStats::default();

        for (_, status) in &*hashmap {
            match *status {
                PollData::NoWebtech => stats.no_webtech += 1,
                PollData::NotStarted => stats.not_started += 1,
                PollData::Started => stats.started += 1,
                PollData::Done => stats.done += 1,
                PollData::DoneWebtech => stats.done_webtech += 1,
            };
        }

        stats
    }
}

#[get("/")]
fn index() -> io::Result<NamedFile> {
    NamedFile::open("static/index.html")
}

#[get("/static/<file..>")]
fn files(file: PathBuf) -> Option<NamedFile> {
    NamedFile::open(Path::new("static/").join(file)).ok()
}

#[get("/poll-stats", format = "application/json")]
fn poll_stats(map: State<PollMap>) -> Json<PollStats> {
    Json(PollStats::from(map.inner()))
}

#[post("/poll", format = "application/json", data = "<polldata>")]
fn new_poll(polldata: Json<PollData>, map: State<PollMap>) -> Json {
    let mut hashmap = map.lock().unwrap();
    let id = hashmap.len();
    hashmap.insert(id, polldata.0);
    Json(json!({ "id": id.to_string() }))
}

#[get("/poll/<id>", format = "application/json")]
fn get_poll(id: ID, map: State<PollMap>) -> Option<Json<PollData>> {
    let hashmap = map.lock().unwrap();
    match hashmap.get(&id) {
        Some(value) => Some(Json(*value)),
        None => None,
    }
}

#[put("/poll/<id>", format = "application/json", data = "<polldata>")]
fn update_poll(id: ID, polldata: Json<PollData>, map: State<PollMap>) -> Json {
    let mut hashmap = map.lock().unwrap();
    if hashmap.contains_key(&id) {
        hashmap.insert(id, polldata.0);
        Json(json!({ "status": "ok" }))
    } else {
        Json(json!({ "status": "err" }))
    }
}

fn rocket() -> rocket::Rocket {
    rocket::ignite()
        .mount("/", routes![index, files, poll_stats,
                            new_poll, get_poll, update_poll])
        .manage(Mutex::new(HashMap::<ID, PollData>::new()))
}

fn main() {
    rocket().launch();
}
