import mido
from mido import Message, MidiFile, MidiTrack

def criar_midi_fantasma():
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)

    # Configura o instrumento: Órgão (Program Change 16 = Drawbar Organ / Rock Organ)
    track.append(Message('program_change', program=16, time=0))

    # Andamento e Notas (Intro Clássica do Fantasma em Ré Menor)
    # Riff cromático descendente marcante: D5 -> C#5 -> C5 -> B4 -> Bb4
    
    tempo = 120
    ticks_por_nota = 240  # Colcheia
    
    # Sequência de notas (Nota MIDI, Duração)
    melodia = [
        # Frase 1 (A descida clássica)
        (74, ticks_por_nota), # D5
        (73, ticks_por_nota), # C#5
        (72, ticks_por_nota), # C5
        (71, ticks_por_nota), # B4
        (70, ticks_por_nota * 4), # Bb4 (Sustenta)
        
        # Pausa curta
        (0, ticks_por_nota),
        
        # Frase 2 (Repetição mais grave)
        (62, ticks_por_nota), # D4
        (61, ticks_por_nota), # C#4
        (60, ticks_por_nota), # C4
        (59, ticks_por_nota), # B3
        (58, ticks_por_nota * 4), # Bb3
        
        # Pausa
        (0, ticks_por_nota),
        
        # Acorde final impactante em Ré Menor (D4 + F4 + A4 + D5)
        (62, ticks_por_nota * 8), # D4
    ]

    for nota, duracao in melodia:
        if nota == 0:
            # Silêncio
            track.append(Message('note_off', note=60, velocity=0, time=duracao))
        else:
            # Toca a nota
            track.append(Message('note_on', note=nota, velocity=110, time=0))
            track.append(Message('note_off', note=nota, velocity=0, time=duracao))

    # Salva o arquivo MIDI
    mid.save('fantasma_da_opera.mid')
    print("Arquivo 'fantasma_da_opera.mid' gerado com sucesso!")

if __name__ == '__main__':
    criar_midi_fantasma()